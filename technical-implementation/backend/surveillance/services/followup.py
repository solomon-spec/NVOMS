from django.utils import timezone


def assign_follow_up(report, action_taken, created_by, assigned_to=None, due_date=None):
    from surveillance.models import FollowUpAction
    follow_up = FollowUpAction.objects.create(
        report=report,
        action_taken=action_taken,
        assigned_to=assigned_to,
        due_date=due_date,
        created_by=created_by,
    )
    if report.status == report.Status.SUBMITTED:
        report.status = report.Status.UNDER_FOLLOW_UP
        report.save(update_fields=['status'])
    return follow_up


def close_follow_up(follow_up):
    from surveillance.models import FollowUpAction
    follow_up.status = FollowUpAction.Status.COMPLETED
    follow_up.closed_at = timezone.now()
    follow_up.save(update_fields=['status', 'closed_at'])

    report = follow_up.report
    all_closed = not report.follow_ups.filter(
        status=FollowUpAction.Status.OPEN
    ).exists()
    if all_closed:
        report.status = report.Status.CLOSED
        report.save(update_fields=['status'])
    return follow_up
