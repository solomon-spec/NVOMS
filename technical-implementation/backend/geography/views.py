from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from geography.models import AdministrativeUnit
from geography.serializers import AdministrativeUnitSerializer
from users.permissions import IsAdmin


class AdministrativeUnitListView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get(self, request):
        qs = AdministrativeUnit.objects.select_related('parent')

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))

        level = request.query_params.get('level')
        if level:
            qs = qs.filter(level=level)

        parent_id = request.query_params.get('parent')
        if parent_id:
            qs = qs.filter(parent_id=parent_id)

        active_only = request.query_params.get('active')
        if active_only == 'true':
            qs = qs.filter(is_active=True)

        serializer = AdministrativeUnitSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = AdministrativeUnitSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        unit = serializer.save()
        return Response(
            AdministrativeUnitSerializer(unit, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdministrativeUnitDetailView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdmin()]

    def _get_unit(self, pk):
        return get_object_or_404(AdministrativeUnit.objects.select_related('parent'), pk=pk)

    def get(self, request, pk):
        return Response(AdministrativeUnitSerializer(self._get_unit(pk), context={'request': request}).data)

    def put(self, request, pk):
        unit = self._get_unit(pk)
        serializer = AdministrativeUnitSerializer(unit, data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request, pk):
        unit = self._get_unit(pk)
        serializer = AdministrativeUnitSerializer(
            unit,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        unit = self._get_unit(pk)
        if unit.children.exists():
            return Response(
                {
                    'errorCode': 'STATE_CONFLICT',
                    'message': 'Cannot delete an administrative unit with child units.',
                },
                status=status.HTTP_409_CONFLICT,
            )
        unit.is_active = False
        unit.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)
