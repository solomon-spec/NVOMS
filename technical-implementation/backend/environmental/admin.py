from django.contrib import admin

from environmental.models import MeteorologicalObservation


@admin.register(MeteorologicalObservation)
class MeteorologicalObservationAdmin(admin.ModelAdmin):
    list_display = ('unit', 'observation_date', 'rainfall_mm', 'temperature_c', 'source')
    list_filter = ('source', 'observation_date')
    search_fields = ('unit__name', 'unit__code')
