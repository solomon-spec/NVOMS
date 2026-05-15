from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import AuditLog
from core.pagination import StandardPagination
from core.serializers import AuditLogSerializer
from users.permissions import IsAdmin


class AuditLogListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = AuditLog.objects.select_related('actor_user').order_by('-timestamp')

        actor_user_id = request.query_params.get('actor_user_id')
        if actor_user_id:
            qs = qs.filter(actor_user_id=actor_user_id)

        action = request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)

        entity_type = request.query_params.get('entity_type')
        if entity_type:
            qs = qs.filter(entity_type=entity_type)

        date_from = request.query_params.get('date_from')
        if date_from:
            parsed = parse_date(date_from)
            if parsed is None:
                return Response({'date_from': 'Invalid date.'}, status=status.HTTP_400_BAD_REQUEST)
            qs = qs.filter(timestamp__date__gte=parsed)

        date_to = request.query_params.get('date_to')
        if date_to:
            parsed = parse_date(date_to)
            if parsed is None:
                return Response({'date_to': 'Invalid date.'}, status=status.HTTP_400_BAD_REQUEST)
            qs = qs.filter(timestamp__date__lte=parsed)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        serializer = AuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
