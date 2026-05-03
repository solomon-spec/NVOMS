from django.contrib import admin

from vaccines.models import (
    Antigen,
    EpiScheduleRule,
    EpiScheduleVersion,
    ScheduleRegenerationJob,
    VaccineBatch,
    VaccineDefinition,
)


admin.site.register(Antigen)
admin.site.register(VaccineDefinition)
admin.site.register(EpiScheduleVersion)
admin.site.register(EpiScheduleRule)
admin.site.register(VaccineBatch)
admin.site.register(ScheduleRegenerationJob)
