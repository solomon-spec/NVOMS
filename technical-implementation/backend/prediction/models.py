import uuid

from django.db import models
from django.utils import timezone


class OutbreakRiskScore(models.Model):
    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='risk_score_id'
    )
    unit = models.ForeignKey(
        'geography.AdministrativeUnit',
        on_delete=models.CASCADE,
        related_name='outbreak_risk_scores',
        db_column='unit_id',
    )
    disease = models.CharField(max_length=80)
    risk_score = models.DecimalField(max_digits=5, decimal_places=4)
    computed_at = models.DateTimeField(default=timezone.now)
    model_version = models.CharField(max_length=80, default='heuristic-v1')
    factors = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'outbreak_risk_scores'
        unique_together = [('unit', 'disease')]
        ordering = ['-risk_score', 'unit__name', 'disease']

    def __str__(self):
        return f'{self.unit_id} {self.disease} {self.risk_score}'
