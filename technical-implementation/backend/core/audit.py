from core.models import AuditLog


def request_ip(request):
    if request is None:
        return None
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def write_audit_log(*, actor_user, action, entity_type, entity_id, detail=None, request=None):
    return AuditLog.objects.create(
        actor_user=actor_user if getattr(actor_user, 'is_authenticated', False) else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        detail=detail or {},
        ip_address=request_ip(request),
    )
