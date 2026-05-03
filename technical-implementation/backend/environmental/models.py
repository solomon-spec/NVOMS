import uuid

from django.db import models
from django.utils import timezone


class MeteorologicalObservation(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_column='environmental_observation_id',
    )
    unit = models.ForeignKey(
        'geography.AdministrativeUnit',
        on_delete=models.CASCADE,
        related_name='meteorological_observations',
        db_column='unit_id',
    )
    observation_date = models.DateField()
    rainfall_mm = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    temperature_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    source = models.CharField(max_length=80, default='manual')
    raw_payload = models.JSONField(default=dict, blank=True)
    recorded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'meteorological_observations'
        unique_together = [('unit', 'observation_date', 'source')]
        ordering = ['-observation_date', 'unit__name']

    def __str__(self):
        return f'{self.unit_id} {self.observation_date} {self.source}'
