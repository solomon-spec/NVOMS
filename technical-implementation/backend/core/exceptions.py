from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def nvoms_exception_handler(exc, context):
    """
    Convert DRF exceptions into the API's standard error shape:
    {
      "errorCode": "...",
      "message": "...",
      "details": {...}  # optional
    }
    """
    response = exception_handler(exc, context)
    if response is None:
        return response

    data = response.data
    message = "Request failed."
    details = None

    if isinstance(data, dict):
        if "detail" in data:
            message = str(data.get("detail"))
            details = {
                key: value for key, value in data.items() if key != "detail"
            } or None
        else:
            details = data
            message = "Validation error."
    elif isinstance(data, list):
        details = {"errors": data}
        message = "Validation error."
    else:
        message = str(data)

    status_to_code = {
        status.HTTP_400_BAD_REQUEST: "VALIDATION_ERROR",
        status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
        status.HTTP_403_FORBIDDEN: "FORBIDDEN",
        status.HTTP_404_NOT_FOUND: "NOT_FOUND",
        status.HTTP_409_CONFLICT: "STATE_CONFLICT",
        status.HTTP_422_UNPROCESSABLE_ENTITY: "UNPROCESSABLE",
    }
    error_code = status_to_code.get(response.status_code, "REQUEST_FAILED")

    payload = {"errorCode": error_code, "message": message}
    if details:
        payload["details"] = details
    response.data = payload
    return response
