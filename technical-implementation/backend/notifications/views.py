from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardPagination
from notifications.models import Notification, SmsLog
from notifications.serializers import NotificationSerializer, SmsLogSerializer
from users.permissions import IsAdmin


class NotificationListView(APIView):
    def get(self, request):
        qs = request.user.notifications.order_by('-created_at')
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        serializer = NotificationSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class NotificationReadView(APIView):
    def patch(self, request, pk):
        notification = get_object_or_404(
            Notification,
            pk=pk,
            recipient_user=request.user,
        )
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notification).data)


class NotificationMarkAllReadView(APIView):
    def post(self, request):
        updated = request.user.notifications.filter(is_read=False).update(is_read=True)
        return Response({'updated': updated})


class SmsLogListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = SmsLog.objects.order_by('-sent_at')
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        serializer = SmsLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
