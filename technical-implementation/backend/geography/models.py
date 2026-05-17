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
    name_alt = models.CharField(max_length=255, blank=True)
    source = models.CharField(max_length=120, blank=True)
    source_dataset = models.CharField(max_length=255, blank=True)
    area_sqkm = models.DecimalField(max_digits=14, decimal_places=3, null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    bbox = models.JSONField(null=True, blank=True)
    boundary_geojson = models.JSONField(null=True, blank=True)
    valid_on = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)
    data_version = models.CharField(max_length=64, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'administrative_units'
        indexes = [
            models.Index(fields=['level']),
            models.Index(fields=['parent']),
        ]

    def __str__(self):
        return f'{self.code} – {self.name}'
