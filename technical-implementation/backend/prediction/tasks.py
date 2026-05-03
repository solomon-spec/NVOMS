from celery import shared_task

from prediction.services import compute_outbreak_risk_scores


@shared_task
def compute_outbreak_risk_scores_task():
    scores = compute_outbreak_risk_scores()
    return {'computed': len(scores)}
