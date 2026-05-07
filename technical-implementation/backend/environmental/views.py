from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from environmental.models import MeteorologicalObservation
from environmental.serializers import MeteorologicalObservationSerializer
from users.permissions import ADMIN, IsPublicHealthOfficial, _role_code


class MeteorologicalObservationListCreateView(APIView):
    permission_classes = [IsPublicHealthOfficial]

    def get(self, request):
        qs = MeteorologicalObservation.objects.select_related('unit').order_by('-observation_date')
        unit_id = request.query_params.get('unit_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if unit_id:
            qs = qs.filter(unit_id=unit_id)
        if date_from:
            qs = qs.filter(observation_date__gte=date_from)
        if date_to:
            qs = qs.filter(observation_date__lte=date_to)
        return Response(MeteorologicalObservationSerializer(qs, many=True).data)

    def post(self, request):
        if _role_code(request.user) != ADMIN:
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        many = isinstance(request.data, list)
        serializer = MeteorologicalObservationSerializer(data=request.data, many=many)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        observations = serializer.save()
        return Response(
            MeteorologicalObservationSerializer(observations, many=many).data,
            status=status.HTTP_201_CREATED,
        )
