import logging

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from prediction.models import OutbreakRiskScore
from prediction.serializers import OutbreakRiskScoreSerializer
from prediction.services import compute_outbreak_risk_scores
from prediction.tasks import compute_outbreak_risk_scores_task
from users.permissions import IsPublicHealthOfficial

logger = logging.getLogger(__name__)


class OutbreakRiskScoreListView(APIView):
    permission_classes = [IsPublicHealthOfficial]

    def get(self, request):
        qs = OutbreakRiskScore.objects.select_related('unit').order_by('-computed_at', '-risk_score')
        unit_id = request.query_params.get('unit_id')
        disease = request.query_params.get('disease')
        if unit_id:
            qs = qs.filter(unit_id=unit_id)
        if disease:
            qs = qs.filter(disease__iexact=disease)
        return Response(OutbreakRiskScoreSerializer(qs, many=True).data)


class PredictionRunView(APIView):
    permission_classes = [IsPublicHealthOfficial]

    def post(self, request):
        if settings.CELERY_TASK_ALWAYS_EAGER:
            result = compute_outbreak_risk_scores_task()
            return Response(
                {'status': 'completed', 'task_id': None, **result},
                status=status.HTTP_202_ACCEPTED,
            )

        try:
            async_result = compute_outbreak_risk_scores_task.delay()
            return Response(
                {'status': 'queued', 'task_id': async_result.id},
                status=status.HTTP_202_ACCEPTED,
            )
        except Exception as exc:
            logger.warning('Prediction task dispatch failed, running synchronously: %s', exc)
            scores = compute_outbreak_risk_scores()
            return Response(
                {'status': 'completed', 'task_id': None, 'computed': len(scores)},
                status=status.HTTP_202_ACCEPTED,
            )
