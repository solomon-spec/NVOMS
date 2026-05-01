from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from immunizations.models import PatientVaccinationSchedule
from users.permissions import IsPublicHealthOfficial


class VaccineCoverageView(APIView):
    """
    GET /api/v1/analytics/coverage/

    Returns vaccination coverage statistics across Ethiopia, broken down per vaccine.
    For each vaccine it reports how many patients are scheduled, how many have received
    it, how many are overdue/defaulters, and the overall coverage percentage.

    Used by public health officials and the Ministry of Health dashboard to monitor
    EPI programme performance and identify geographic gaps in coverage.

    Query parameters
    ----------------
    unit_id   : UUID   Filter to patients resident in a specific administrative unit
                       (region, zone, woreda, or kebele). Pass the unit ID.
    vaccine_id: UUID   Restrict to a single vaccine.
    date_from : date   Only include schedule slots with due_date >= date_from.
    date_to   : date   Only include schedule slots with due_date <= date_to.
    """
    permission_classes = [IsPublicHealthOfficial]

    def get(self, request):
        qs = PatientVaccinationSchedule.objects.select_related(
            'vaccine', 'vaccine__antigen', 'patient__residence_unit',
        ).exclude(
            status__in=[
                PatientVaccinationSchedule.SlotStatus.CANCELLED,
                PatientVaccinationSchedule.SlotStatus.EXEMPT,
            ]
        )

        # ── Filters ────────────────────────────────────────────────────────────
        unit_id = request.query_params.get('unit_id')
        if unit_id:
            # Include the unit itself and all children (recursive via descendant IDs)
            descendant_ids = _get_unit_and_descendants(unit_id)
            qs = qs.filter(patient__residence_unit_id__in=descendant_ids)

        vaccine_id = request.query_params.get('vaccine_id')
        if vaccine_id:
            qs = qs.filter(vaccine_id=vaccine_id)

        date_from = request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(due_date__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(due_date__lte=date_to)

        # ── Aggregate per vaccine ──────────────────────────────────────────────
        rows = qs.values(
            'vaccine_id',
            'vaccine__vaccine_code',
            'vaccine__vaccine_name',
            'vaccine__antigen__name',
        ).annotate(
            total_scheduled=Count('id'),
            administered=Count('id', filter=Q(status=PatientVaccinationSchedule.SlotStatus.ADMINISTERED)),
            overdue=Count('id', filter=Q(status=PatientVaccinationSchedule.SlotStatus.OVERDUE)),
            defaulter=Count('id', filter=Q(status=PatientVaccinationSchedule.SlotStatus.DEFAULTER)),
            upcoming=Count('id', filter=Q(status__in=[
                PatientVaccinationSchedule.SlotStatus.SCHEDULED,
                PatientVaccinationSchedule.SlotStatus.PENDING,
                PatientVaccinationSchedule.SlotStatus.DUE_SOON,
                PatientVaccinationSchedule.SlotStatus.DUE_TODAY,
            ])),
        ).order_by('vaccine__vaccine_name')

        vaccines = []
        for row in rows:
            total = row['total_scheduled']
            administered = row['administered']
            missed = row['overdue'] + row['defaulter']
            coverage_pct = round(administered / total * 100, 1) if total else 0.0
            missed_pct = round(missed / total * 100, 1) if total else 0.0

            vaccines.append({
                'vaccine_id': str(row['vaccine_id']),
                'vaccine_code': row['vaccine__vaccine_code'],
                'vaccine_name': row['vaccine__vaccine_name'],
                'antigen_name': row['vaccine__antigen__name'],
                'total_scheduled': total,
                'administered': administered,
                'overdue': row['overdue'],
                'defaulter': row['defaulter'],
                'upcoming': row['upcoming'],
                'coverage_pct': coverage_pct,
                'missed_pct': missed_pct,
            })

        return Response({
            'generated_at': timezone.now().isoformat(),
            'filters': {
                'unit_id': unit_id,
                'vaccine_id': vaccine_id,
                'date_from': date_from,
                'date_to': date_to,
            },
            'summary': _build_summary(vaccines),
            'vaccines': vaccines,
        })


def _build_summary(vaccines):
    """Aggregate across all vaccines for a national headline figure."""
    if not vaccines:
        return {
            'total_scheduled': 0,
            'total_administered': 0,
            'overall_coverage_pct': 0.0,
        }
    total = sum(v['total_scheduled'] for v in vaccines)
    administered = sum(v['administered'] for v in vaccines)
    return {
        'total_scheduled': total,
        'total_administered': administered,
        'overall_coverage_pct': round(administered / total * 100, 1) if total else 0.0,
    }


def _get_unit_and_descendants(unit_id):
    """
    Returns the unit_id itself plus the IDs of all administrative units nested
    under it (children, grandchildren, etc.), enabling region-level filtering
    that automatically includes all woredas and kebeles within that region.
    """
    from geography.models import AdministrativeUnit

    visited = set()
    queue = [unit_id]
    while queue:
        current = queue.pop()
        if current in visited:
            continue
        visited.add(current)
        children = AdministrativeUnit.objects.filter(
            parent_id=current, is_active=True
        ).values_list('id', flat=True)
        queue.extend(str(c) for c in children)
    return list(visited)


class VaccineCoverageByRegionView(APIView):
    """
    GET /api/v1/analytics/coverage/by-region/

    Returns vaccination coverage broken down by top-level administrative region.
    Each region shows the overall coverage percentage and administered count,
    making it easy to compare performance across Ethiopia's regions on a map or chart.

    Query parameters
    ----------------
    vaccine_id: UUID   Restrict to a single vaccine (recommended for focused analysis).
    date_from : date   Only include slots with due_date >= date_from.
    date_to   : date   Only include slots with due_date <= date_to.
    """
    permission_classes = [IsPublicHealthOfficial]

    def get(self, request):
        from geography.models import AdministrativeUnit

        qs = PatientVaccinationSchedule.objects.select_related(
            'patient__residence_unit',
        ).exclude(
            status__in=[
                PatientVaccinationSchedule.SlotStatus.CANCELLED,
                PatientVaccinationSchedule.SlotStatus.EXEMPT,
            ]
        )

        vaccine_id = request.query_params.get('vaccine_id')
        if vaccine_id:
            qs = qs.filter(vaccine_id=vaccine_id)

        date_from = request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(due_date__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(due_date__lte=date_to)

        # Get all top-level regions (no parent)
        regions = AdministrativeUnit.objects.filter(
            parent__isnull=True, is_active=True
        ).order_by('unit_name')

        results = []
        for region in regions:
            region_unit_ids = _get_unit_and_descendants(str(region.id))
            region_qs = qs.filter(patient__residence_unit_id__in=region_unit_ids)

            totals = region_qs.aggregate(
                total_scheduled=Count('id'),
                administered=Count('id', filter=Q(status=PatientVaccinationSchedule.SlotStatus.ADMINISTERED)),
                overdue=Count('id', filter=Q(status__in=[
                    PatientVaccinationSchedule.SlotStatus.OVERDUE,
                    PatientVaccinationSchedule.SlotStatus.DEFAULTER,
                ])),
            )

            total = totals['total_scheduled'] or 0
            adm = totals['administered'] or 0
            results.append({
                'region_id': str(region.id),
                'region_name': region.unit_name,
                'region_code': region.unit_code,
                'total_scheduled': total,
                'administered': adm,
                'overdue_or_defaulter': totals['overdue'] or 0,
                'coverage_pct': round(adm / total * 100, 1) if total else 0.0,
            })

        return Response({
            'generated_at': timezone.now().isoformat(),
            'filters': {
                'vaccine_id': vaccine_id,
                'date_from': date_from,
                'date_to': date_to,
            },
            'regions': results,
        })
