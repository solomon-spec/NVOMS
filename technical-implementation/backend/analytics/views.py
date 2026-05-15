from datetime import timedelta

from django.db.models import Count, Max, Q
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from geography.models import AdministrativeUnit
from immunizations.models import ImmunizationEvent, PatientVaccinationSchedule
from surveillance.models import SurveillanceReport
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


def _active_schedule_queryset():
    return PatientVaccinationSchedule.objects.select_related(
        'vaccine', 'vaccine__antigen', 'patient__residence_unit',
    ).exclude(
        status__in=[
            PatientVaccinationSchedule.SlotStatus.CANCELLED,
            PatientVaccinationSchedule.SlotStatus.EXEMPT,
        ]
    )


def _apply_common_schedule_filters(qs, request, *, allow_unit=True):
    unit_id = request.query_params.get('unit_id')
    if allow_unit and unit_id:
        qs = qs.filter(patient__residence_unit_id__in=_get_unit_and_descendants(unit_id))

    vaccine_id = request.query_params.get('vaccine_id')
    if vaccine_id:
        qs = qs.filter(vaccine_id=vaccine_id)

    date_from = request.query_params.get('date_from')
    if date_from:
        qs = qs.filter(due_date__gte=date_from)

    date_to = request.query_params.get('date_to')
    if date_to:
        qs = qs.filter(due_date__lte=date_to)

    return qs


def _date_label(value):
    if hasattr(value, 'date'):
        value = value.date()
    return value.isoformat()


class DefaulterClusterView(APIView):
    """
    GET /api/v1/analytics/defaulters/by-cluster/

    Groups overdue/defaulter schedule slots by the patient's residence unit so
    outreach teams can identify geographic pockets of missed vaccinations.
    """
    permission_classes = [IsPublicHealthOfficial]

    def get(self, request):
        try:
            min_defaulters = int(request.query_params.get('min_defaulters', 1))
        except ValueError:
            return Response(
                {'min_defaulters': 'Must be an integer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = _apply_common_schedule_filters(
            _active_schedule_queryset().filter(patient__residence_unit__isnull=False),
            request,
            allow_unit=False,
        )

        rows = (
            qs.values(
                'patient__residence_unit_id',
                'patient__residence_unit__name',
                'patient__residence_unit__level',
            )
            .annotate(
                total_scheduled=Count('id'),
                administered=Count(
                    'id',
                    filter=Q(status=PatientVaccinationSchedule.SlotStatus.ADMINISTERED),
                ),
                defaulter_count=Count(
                    'id',
                    filter=Q(status__in=[
                        PatientVaccinationSchedule.SlotStatus.OVERDUE,
                        PatientVaccinationSchedule.SlotStatus.DEFAULTER,
                    ]),
                ),
            )
            .filter(defaulter_count__gte=min_defaulters)
            .order_by('-defaulter_count', 'patient__residence_unit__name')
        )

        missing_rows = (
            qs.filter(status__in=[
                PatientVaccinationSchedule.SlotStatus.OVERDUE,
                PatientVaccinationSchedule.SlotStatus.DEFAULTER,
            ])
            .values('patient__residence_unit_id', 'vaccine__vaccine_name')
            .annotate(missed=Count('id'))
            .order_by('patient__residence_unit_id', '-missed', 'vaccine__vaccine_name')
        )
        missing_by_unit = {}
        for row in missing_rows:
            missing_by_unit.setdefault(row['patient__residence_unit_id'], []).append(
                row['vaccine__vaccine_name']
            )

        clusters = []
        for row in rows:
            total = row['total_scheduled'] or 0
            administered = row['administered'] or 0
            unit_id = row['patient__residence_unit_id']
            clusters.append({
                'unit_id': str(unit_id),
                'unit_name': row['patient__residence_unit__name'],
                'level': row['patient__residence_unit__level'],
                'defaulter_count': row['defaulter_count'],
                'coverage_pct': round(administered / total * 100, 1) if total else 0.0,
                'vaccines_missing': missing_by_unit.get(unit_id, []),
            })
        return Response(clusters)


class CoverageTrendView(APIView):
    """
    GET /api/v1/analytics/coverage/trend/

    Returns day/week/month coverage snapshots over the requested schedule window.
    """
    permission_classes = [IsPublicHealthOfficial]

    truncators = {
        'day': TruncDay,
        'week': TruncWeek,
        'month': TruncMonth,
    }

    def get(self, request):
        granularity = request.query_params.get('granularity', 'month')
        truncator = self.truncators.get(granularity)
        if truncator is None:
            return Response(
                {'granularity': 'Use day, week, or month.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = _apply_common_schedule_filters(_active_schedule_queryset(), request)
        rows = (
            qs.annotate(bucket=truncator('due_date'))
            .values('bucket')
            .annotate(
                total_scheduled=Count('id'),
                administered=Count(
                    'id',
                    filter=Q(status=PatientVaccinationSchedule.SlotStatus.ADMINISTERED),
                ),
            )
            .order_by('bucket')
        )

        return Response([
            {
                'date': _date_label(row['bucket']),
                'overall_coverage_pct': round(
                    row['administered'] / row['total_scheduled'] * 100,
                    1,
                ) if row['total_scheduled'] else 0.0,
                'administered': row['administered'],
            }
            for row in rows
        ])


class ReportingGapView(APIView):
    """
    GET /api/v1/analytics/reporting-gaps/

    Lists active administrative units with no surveillance or immunization
    activity within the expected reporting threshold.
    """
    permission_classes = [IsPublicHealthOfficial]

    def get(self, request):
        try:
            threshold_days = int(request.query_params.get('threshold_days', 14))
        except ValueError:
            return Response(
                {'threshold_days': 'Must be an integer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if threshold_days < 0:
            return Response(
                {'threshold_days': 'Must be zero or greater.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        cutoff = now - timedelta(days=threshold_days)
        gaps = []

        units = AdministrativeUnit.objects.filter(is_active=True).order_by('level', 'name')
        for unit in units:
            unit_ids = _get_unit_and_descendants(str(unit.id))
            latest_immunization = ImmunizationEvent.objects.filter(
                patient__residence_unit_id__in=unit_ids,
            ).aggregate(value=Max('administered_at'))['value']
            latest_surveillance = SurveillanceReport.objects.filter(
                patient__residence_unit_id__in=unit_ids,
            ).aggregate(value=Max('created_at'))['value']
            latest = max(
                [value for value in (latest_immunization, latest_surveillance) if value],
                default=None,
            )

            if latest and latest >= cutoff:
                continue

            days_since = (now - latest).days if latest else threshold_days + 1
            gaps.append({
                'unit_id': str(unit.id),
                'unit_name': unit.name,
                'days_since_last_report': days_since,
                'level': unit.level,
            })

        return Response(gaps)


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
        ).order_by('name')

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
                'region_name': region.name,
                'region_code': region.code,
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
