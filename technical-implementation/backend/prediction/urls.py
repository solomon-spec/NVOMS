from django.urls import path

from prediction.views import OutbreakRiskScoreListView, PredictionRunView

urlpatterns = [
    path('risk-scores/', OutbreakRiskScoreListView.as_view(), name='prediction-risk-scores'),
    path('run/', PredictionRunView.as_view(), name='prediction-run'),
]
