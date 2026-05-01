import uuid

from django.db import models


class AdministrativeUnit(models.Model):
    class Level(models.TextChoices):
        COUNTRY = 'country', 'Country'
        REGION = 'region', 'Region'
        ZONE = 'zone', 'Zone'
        WOREDA = 'woreda', 'Woreda'
        KEBELE = 'kebele', 'Kebele'

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='unit_id'
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
        db_column='parent_unit_id',
    )
    level = models.CharField(max_length=20, choices=Level.choices)
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=120)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    boundary_geojson = models.JSONField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'administrative_units'

    def __str__(self):
        return f'{self.code} – {self.name}'
