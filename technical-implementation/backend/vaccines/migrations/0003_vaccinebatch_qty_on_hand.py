from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vaccines', '0002_scheduleregenerationjob'),
    ]

    operations = [
        migrations.AddField(
            model_name='vaccinebatch',
            name='qty_on_hand',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
