from django.urls import path

from .views import ExportCsvView, SummaryReportView

urlpatterns = [
    path("summary/", SummaryReportView.as_view(), name="report-summary"),
    path("export/", ExportCsvView.as_view(), name="report-export"),
]
