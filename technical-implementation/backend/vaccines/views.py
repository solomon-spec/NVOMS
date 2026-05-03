from django.db.models import Q
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsAdmin, IsHealthWorker, IsPublicHealthOfficial
from vaccines.models import (
    Antigen,
    EpiScheduleRule,
    EpiScheduleVersion,
    ScheduleRegenerationJob,
    VaccineBatch,
    VaccineDefinition,
)
from vaccines.serializers import (
    AntigenSerializer,
    EpiScheduleRuleSerializer,
    EpiScheduleVersionDetailSerializer,
    EpiScheduleVersionSerializer,
    ScheduleRegenerationJobSerializer,
    VaccineBatchSerializer,
    VaccineSerializer,
)
from vaccines.tasks import regenerate_schedules_for_version_task


class AntigenListView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsPublicHealthOfficial()]

    def get(self, request):
        qs = Antigen.objects.all()

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))

        active_only = request.query_params.get('active')
        if active_only == 'true':
            qs = qs.filter(is_active=True)

        return Response(AntigenSerializer(qs, many=True).data)

    def post(self, request):
        serializer = AntigenSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        antigen = serializer.save()
        return Response(AntigenSerializer(antigen).data, status=status.HTTP_201_CREATED)


class AntigenDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsPublicHealthOfficial()]

    def _get_antigen(self, pk):
        return get_object_or_404(Antigen, pk=pk)

    def get(self, request, pk):
        return Response(AntigenSerializer(self._get_antigen(pk)).data)

    def put(self, request, pk):
        antigen = self._get_antigen(pk)
        serializer = AntigenSerializer(antigen, data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request, pk):
        antigen = self._get_antigen(pk)
        serializer = AntigenSerializer(antigen, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)


class VaccineListView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsPublicHealthOfficial()]

    def get(self, request):
        qs = VaccineDefinition.objects.select_related('antigen')

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(vaccine_name__icontains=search) | Q(vaccine_code__icontains=search)
            )

        antigen_id = request.query_params.get('antigen')
        if antigen_id:
            qs = qs.filter(antigen_id=antigen_id)

        active_only = request.query_params.get('active')
        if active_only == 'true':
            qs = qs.filter(is_active=True)

        return Response(VaccineSerializer(qs, many=True).data)

    def post(self, request):
        serializer = VaccineSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        vaccine = serializer.save()
        return Response(
            VaccineSerializer(VaccineDefinition.objects.select_related('antigen').get(pk=vaccine.pk)).data,
            status=status.HTTP_201_CREATED,
        )


class VaccineDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsPublicHealthOfficial()]

    def _get_vaccine(self, pk):
        return get_object_or_404(VaccineDefinition.objects.select_related('antigen'), pk=pk)

    def get(self, request, pk):
        return Response(VaccineSerializer(self._get_vaccine(pk)).data)

    def put(self, request, pk):
        vaccine = self._get_vaccine(pk)
        serializer = VaccineSerializer(vaccine, data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(VaccineSerializer(self._get_vaccine(pk)).data)

    def patch(self, request, pk):
        vaccine = self._get_vaccine(pk)
        serializer = VaccineSerializer(vaccine, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(VaccineSerializer(self._get_vaccine(pk)).data)


# ── Vaccine Batches ───────────────────────────────────────────────────────────

class VaccineBatchListView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsHealthWorker()]

    def get(self, request):
        qs = VaccineBatch.objects.select_related('vaccine')

        vaccine_id = request.query_params.get('vaccine')
        if vaccine_id:
            qs = qs.filter(vaccine_id=vaccine_id)

        valid_only = request.query_params.get('valid')
        if valid_only == 'true':
            qs = qs.filter(is_valid=True)

        return Response(VaccineBatchSerializer(qs, many=True).data)

    def post(self, request):
        serializer = VaccineBatchSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        batch = serializer.save()
        return Response(
            VaccineBatchSerializer(VaccineBatch.objects.select_related('vaccine').get(pk=batch.pk)).data,
            status=status.HTTP_201_CREATED,
        )


class VaccineBatchDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsHealthWorker()]

    def _get_batch(self, pk):
        return get_object_or_404(VaccineBatch.objects.select_related('vaccine'), pk=pk)

    def get(self, request, pk):
        return Response(VaccineBatchSerializer(self._get_batch(pk)).data)

    def put(self, request, pk):
        batch = self._get_batch(pk)
        serializer = VaccineBatchSerializer(batch, data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(VaccineBatchSerializer(self._get_batch(pk)).data)

    def patch(self, request, pk):
        batch = self._get_batch(pk)
        serializer = VaccineBatchSerializer(batch, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(VaccineBatchSerializer(self._get_batch(pk)).data)


# ── EPI Schedule Versions ─────────────────────────────────────────────────────

class EpiScheduleVersionListView(APIView):
    permission_classes = [IsPublicHealthOfficial]

    def get(self, request):
        qs = EpiScheduleVersion.objects.all().order_by('-effective_from')

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        return Response(EpiScheduleVersionSerializer(qs, many=True).data)

    def post(self, request):
        serializer = EpiScheduleVersionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        version = serializer.save(created_by=request.user)
        return Response(EpiScheduleVersionSerializer(version).data, status=status.HTTP_201_CREATED)


class EpiScheduleVersionDetailView(APIView):
    permission_classes = [IsPublicHealthOfficial]

    def _get_version(self, pk):
        return get_object_or_404(EpiScheduleVersion, pk=pk)

    def get(self, request, pk):
        version = get_object_or_404(
            EpiScheduleVersion.objects.prefetch_related('rules__vaccine'), pk=pk
        )
        return Response(EpiScheduleVersionDetailSerializer(version).data)

    def put(self, request, pk):
        version = self._get_version(pk)
        serializer = EpiScheduleVersionSerializer(version, data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request, pk):
        version = self._get_version(pk)
        serializer = EpiScheduleVersionSerializer(version, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)


class EpiScheduleRegenerateAllView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, version_pk):
        version = get_object_or_404(EpiScheduleVersion, pk=version_pk)
        job = ScheduleRegenerationJob.objects.create(
            schedule_version=version,
            requested_by=request.user,
        )

        if settings.CELERY_TASK_ALWAYS_EAGER:
            regenerate_schedules_for_version_task(str(job.id))
        else:
            try:
                async_result = regenerate_schedules_for_version_task.delay(str(job.id))
                job.celery_task_id = async_result.id
                job.save(update_fields=['celery_task_id'])
            except Exception as exc:
                job.error_message = str(exc)
                job.save(update_fields=['error_message'])
                regenerate_schedules_for_version_task(str(job.id))

        job.refresh_from_db()
        return Response(
            ScheduleRegenerationJobSerializer(job).data,
            status=status.HTTP_202_ACCEPTED,
        )


class EpiScheduleRegenerationStatusView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, version_pk):
        version = get_object_or_404(EpiScheduleVersion, pk=version_pk)
        job = (
            ScheduleRegenerationJob.objects
            .filter(schedule_version=version)
            .order_by('-created_at')
            .first()
        )
        if not job:
            return Response(
                {'detail': 'No regeneration job has been started for this schedule version.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(ScheduleRegenerationJobSerializer(job).data)


# ── EPI Schedule Rules ────────────────────────────────────────────────────────

class EpiScheduleRuleListView(APIView):
    permission_classes = [IsPublicHealthOfficial]

    def get(self, request, version_pk):
        version = get_object_or_404(EpiScheduleVersion, pk=version_pk)
        rules = version.rules.select_related('vaccine').order_by('recommended_age_days')
        return Response(EpiScheduleRuleSerializer(rules, many=True).data)

    def post(self, request, version_pk):
        version = get_object_or_404(EpiScheduleVersion, pk=version_pk)
        serializer = EpiScheduleRuleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        rule = serializer.save(schedule_version=version)
        return Response(
            EpiScheduleRuleSerializer(
                EpiScheduleRule.objects.select_related('vaccine').get(pk=rule.pk)
            ).data,
            status=status.HTTP_201_CREATED,
        )


class EpiScheduleRuleDetailView(APIView):
    permission_classes = [IsPublicHealthOfficial]

    def _get_rule(self, version_pk, pk):
        get_object_or_404(EpiScheduleVersion, pk=version_pk)
        return get_object_or_404(
            EpiScheduleRule.objects.select_related('vaccine'),
            pk=pk,
            schedule_version_id=version_pk,
        )

    def get(self, request, version_pk, pk):
        return Response(EpiScheduleRuleSerializer(self._get_rule(version_pk, pk)).data)

    def put(self, request, version_pk, pk):
        rule = self._get_rule(version_pk, pk)
        serializer = EpiScheduleRuleSerializer(rule, data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request, version_pk, pk):
        rule = self._get_rule(version_pk, pk)
        serializer = EpiScheduleRuleSerializer(rule, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, version_pk, pk):
        rule = self._get_rule(version_pk, pk)
        rule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
