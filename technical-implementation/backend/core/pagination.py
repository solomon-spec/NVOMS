# core/pagination.py

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    """
    Standard pagination used across NVOMS API.
    Matches the OpenAPI spec: page, pageSize, total
    """
    page_size = 20
    page_size_query_param = 'pageSize'
    max_page_size = 100
    page_query_param = 'page'

    def get_paginated_response(self, data):
        return Response({
            'items': data,
            'page': self.page.number,
            'pageSize': self.page_size,
            'total': self.page.paginator.count,
        })