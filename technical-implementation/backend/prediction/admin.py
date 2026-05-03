from django.contrib import admin

from prediction.models import OutbreakRiskScore


@admin.register(OutbreakRiskScore)
class OutbreakRiskScoreAdmin(admin.ModelAdmin):
    list_display = ('unit', 'disease', 'risk_score', 'computed_at', 'model_version')
    list_filter = ('disease', 'model_version')
    search_fields = ('unit__name', 'disease')
