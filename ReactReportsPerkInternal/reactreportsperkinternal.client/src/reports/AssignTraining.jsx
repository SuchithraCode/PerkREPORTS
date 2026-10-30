
import {
    useEffect,
    useState,
    useCallback,
    useRef,
    useLayoutEffect
} from "react";

import { useParams } from "react-router-dom";

import {
    getAssignTrainingReport,
    exportAssignTraining
} from "../services/othersReportService";

import Pagination from "../Common/Pagination";
import Loader from "../Common/Loader";

function AssignTraining() {
    const { requestId } = useParams();

    const headerRef = useRef(null);
    const bodyRef = useRef(null);

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [exportLoading, setExportLoading] = useState(false);
    const [exportType, setExportType] = useState("excel");

    const [pageNumber, setPageNumber] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [filterSelect, setFilterSelect] = useState(10);

    // Load assigned training report
    const loadReport = useCallback(
        async (id, page, pageSize) => {
            try {
                setLoading(true);
                setError(null);

                const response = await getAssignTrainingReport(
                    id,
                    page,
                    pageSize
                );

                setReport(response);
                setTotalRecords(response?.totalRecords ?? 0);
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    (typeof err.response?.data === "string"
                        ? err.response.data
                        : null) ||
                    err.message ||
                    "Failed to fetch assigned training report."
                );
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        if (!requestId) {
            setError("Report request ID is missing.");
            setLoading(false);
            return;
        }

        loadReport(requestId, pageNumber, filterSelect);
    }, [requestId, pageNumber, filterSelect, loadReport]);

    // Synchronize horizontal scrolling between table header and body
    useLayoutEffect(() => {
        if (!report || loading) return;

        const header = headerRef.current;
        const body = bodyRef.current;

        if (!header || !body) return;

        let isSyncing = false;

        const syncHeader = () => {
            if (isSyncing) return;

            isSyncing = true;
            header.scrollLeft = body.scrollLeft;

            requestAnimationFrame(() => {
                isSyncing = false;
            });
        };

        const syncBody = () => {
            if (isSyncing) return;

            isSyncing = true;
            body.scrollLeft = header.scrollLeft;

            requestAnimationFrame(() => {
                isSyncing = false;
            });
        };

        body.addEventListener("scroll", syncHeader, { passive: true });
        header.addEventListener("scroll", syncBody, { passive: true });

        header.scrollLeft = body.scrollLeft;

        return () => {
            body.removeEventListener("scroll", syncHeader);
            header.removeEventListener("scroll", syncBody);
        };
    }, [report, loading]);

    // Export report
    const handleExportClick = () => {
        if (!requestId) return;

        try {
            setError(null);
            setExportLoading(true);

            exportAssignTraining(requestId, exportType);
        } catch (err) {
            setError(
                err.message || "Failed to export assigned training report."
            );
        } finally {
            setExportLoading(false);
        }
    };

    // Pagination
    const handlePaginationChange = (value) => {
        if (value === pageNumber) return;
        setPageNumber(value);
    };

    const handlePageSizeChange = (pageSize) => {
        const newPageSize = Number(pageSize);
        const totalPages = Math.ceil(totalRecords / newPageSize);

        setPageNumber((currentPage) =>
            currentPage > totalPages
                ? Math.max(totalPages, 1)
                : currentPage
        );

        setFilterSelect(newPageSize);
    };

    // Display empty values as a dash
    const getCellValue = (value) => {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "-";
        }

        return value;
    };

    // Format date: dd/MM/yyyy
    const formatDate = (dateValue) => {
        if (!dateValue) return "-";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return "-";

        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(date);
    };

    // Format date and time: dd/MM/yyyy h:mm AM/PM
    const formatDateTime = (dateValue) => {
        if (!dateValue) return "-";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return "-";

        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        }).format(date);
    };

    // Format report heading dates: MMM dd, yyyy
    const formatHeaderDate = (dateValue) => {
        if (!dateValue) return "-";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return "-";

        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric"
        }).format(date);
    };

    // Format duration: hh:mm
    const formatDuration = (duration) => {
        if (duration === null || duration === undefined || duration === "") {
            return "-";
        }

        // Supports a TimeSpan serialized as "hh:mm:ss" or "d.hh:mm:ss".
        if (typeof duration === "string") {
            const match = duration.match(
                /^(-)?(?:(\d+)\.)?(\d+):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/
            );

            if (match) {
                const sign = match[1] || "";
                const days = Number(match[2] || 0);
                const hours = Number(match[3] || 0);
                const minutes = match[4];

                const totalHours = days * 24 + hours;

                return `${sign}${String(totalHours).padStart(2, "0")}:${minutes}`;
            }

            // Also support a numeric duration expressed in minutes.
            if (/^-?\d+(\.\d+)?$/.test(duration)) {
                const totalMinutes = Math.abs(Number(duration));
                const hours = Math.floor(totalMinutes / 60);
                const minutes = Math.floor(totalMinutes % 60);
                const sign = Number(duration) < 0 ? "-" : "";

                return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
            }

            return duration;
        }

        // Supports a numeric duration expressed in minutes.
        if (typeof duration === "number" && Number.isFinite(duration)) {
            const totalMinutes = Math.abs(Math.trunc(duration));
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const sign = duration < 0 ? "-" : "";

            return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
        }

        return getCellValue(duration);
    };

    // Generated timestamp
    const getGeneratedOnLabel = () => {
        const now = new Date();

        const formatter = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        });

        return `Generated on: ${formatter.format(now)}`;
    };

    const columnWidths = [
        130, 180, 140, 220, 160,
        160, 130, 120, 180, 130
    ];

    if (loading && !report) {
        return <Loader show={true} />;
    }

    if (error && !report) {
        return (
            <div className="alert alert-danger m-3">
                Error: {typeof error === "string" ? error : JSON.stringify(error)}
            </div>
        );
    }

    if (!report) {
        return (
            <div className="p-5 text-center">
                No assigned training data found.
            </div>
        );
    }

    // API returns only the current page's records.
    const trainingData = report?.data ?? [];

    return (
        <div className="bg-second p-3 position-relative">
            <style>
                {`
                    .AssignTrainingReportTable th,
                    .AssignTrainingReportTable td {
                        border: 1px solid #cbd5e1 !important;
                        box-sizing: border-box;
                    }

                    .AssignTrainingReportTable {
                        border-collapse: collapse !important;
                        table-layout: fixed;
                        margin-bottom: 0;
                    }

                    .AssignTrainingReportTable th,
                    .AssignTrainingReportTable td {
                        overflow-wrap: anywhere;
                    }
                `}
            </style>

            {/* Report loading */}
            {loading && <Loader show={true} />}

            {/* Export overlay */}
            {exportLoading && (
                <div
                    className="position-absolute w-100 h-100 top-0 start-0 d-flex flex-column justify-content-center align-items-center"
                    style={{
                        zIndex: 10,
                        background: "rgba(255,255,255,0.8)"
                    }}
                >
                    <Loader show={true} />
                    <span className="fw-bold text-dark">
                        Preparing Assigned Training export...
                    </span>
                    <span className="text-secondary small">
                        Please do not close your browser tab.
                    </span>
                </div>
            )}

            {/* Main heading */}
            <div className="d-flex justify-content-between align-items-center">
                <label className="perk-font-18 perk-fw-700 perk-text-primary">
                    Employee Assigned Training Report
                </label>

                <label className="perk-font-14 perk-fw-400 perk-text-primary">
                    {getGeneratedOnLabel()}
                </label>
            </div>

            <div className="content-Container p-3 mt-3">
                {/* Report title and date range */}
                <div className="d-flex justify-content-between align-items-center">
                    <label className="perk-font-16 perk-fw-600 perk-text-primary">
                        Assigned Training
                    </label>

                    <label className="perk-font-16 perk-fw-600 perk-text-secoundary">
                        Report From:{" "}
                        {formatHeaderDate(report?.startDate)}
                        {" - "}
                        {formatHeaderDate(report?.endDate)}
                    </label>
                </div>

                {/* Selection dates */}
                <div className="mt-2">
                    <label className="perk-font-14 perk-fw-600 perk-text-primary">
                        Selection: {formatDate(report?.startDate)}
                        {" - "}
                        {formatDate(report?.endDate)}
                    </label>
                </div>

                {/* Export options */}
                <div className="mt-3 d-flex justify-content-end align-items-center">
                    <div className="d-flex gap-2">
                        <select
                            className="form-select width-88 perk-font-12 perk-fw-400"
                            value={exportType}
                            onChange={(e) => setExportType(e.target.value)}
                            disabled={exportLoading}
                        >
                            <option value="excel">Excel</option>
                            <option value="pdf">PDF</option>
                            <option value="csv">CSV</option>
                        </select>

                        <button
                            className="btn btn-primary"
                            onClick={handleExportClick}
                            disabled={exportLoading || loading}
                        >
                            Export
                        </button>
                    </div>
                </div>

                {/* Assigned training table */}

                <div className="perk-datatable-container mt-2">
                    <div
                        ref={headerRef}
                        className="perk-datatable-header"
                    >
                        <table className="Polaris-DataTable__Table">
                            <thead className="custom-thead table-primary">
                                <tr>
                                    <th className="Polaris-DataTable__Cell Polaris-DataTable__Cell--header perk-table-s3">
                                        Employee Code
                                    </th>
                                    <th className="Polaris-DataTable__Cell Polaris-DataTable__Cell--header perk-table-s4">
                                        Employee Name
                                    </th>
                                    <th className="Polaris-DataTable__Cell Polaris-DataTable__Cell--header perk-table-s3">
                                        Training Code
                                    </th>
                                    <th className="Polaris-DataTable__Cell Polaris-DataTable__Cell--header perk-table-s5">
                                        Training Name
                                    </th>
                                    <th className="Polaris-DataTable__Cell Polaris-DataTable__Cell--header perk-table-s3">
                                        Start Date
                                    </th>
                                    <th className="Polaris-DataTable__Cell Polaris-DataTable__Cell--header perk-table-s3">
                                        End Date
                                    </th>
                                    <th className="Polaris-DataTable__Cell Polaris-DataTable__Cell--header perk-table-s2">
                                        Batch
                                    </th>
                                    <th className="Polaris-DataTable__Cell Polaris-DataTable__Cell--header perk-table-s2">
                                        Duration
                                    </th>
                                    <th className="Polaris-DataTable__Cell Polaris-DataTable__Cell--header perk-table-s4">
                                        Trainer Name
                                    </th>
                                    <th className="Polaris-DataTable__Cell Polaris-DataTable__Cell--header perk-table-s2">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                        </table>
                    </div>

                    <div
                        ref={bodyRef}
                        className="perk-datatable-body"
                    >
                        <table className="Polaris-DataTable__Table">
                            <tbody>
                                {trainingData.length > 0 ? (
                                    trainingData.map((training, index) => (
                                        <tr
                                            key={training.id ?? index}
                                            className="Polaris-DataTable__TableRow"
                                        >
                                            <td className="Polaris-DataTable__Cell perk-table-s3">
                                                {getCellValue(training.employeeCode)}
                                            </td>
                                            <td className="Polaris-DataTable__Cell perk-table-s4">
                                                {getCellValue(training.employeeName)}
                                            </td>
                                            <td className="Polaris-DataTable__Cell perk-table-s3">
                                                {getCellValue(training.trainingCode)}
                                            </td>
                                            <td className="Polaris-DataTable__Cell perk-table-s5">
                                                {getCellValue(training.trainingName)}
                                            </td>
                                            <td className="Polaris-DataTable__Cell perk-table-s3">
                                                {formatDateTime(training.startDate)}
                                            </td>
                                            <td className="Polaris-DataTable__Cell perk-table-s3">
                                                {formatDateTime(training.endDate)}
                                            </td>
                                            <td className="Polaris-DataTable__Cell perk-table-s2">
                                                {getCellValue(training.batch)}
                                            </td>
                                            <td className="Polaris-DataTable__Cell perk-table-s2">
                                                {formatDuration(training.duration)}
                                            </td>
                                            <td className="Polaris-DataTable__Cell perk-table-s4">
                                                {getCellValue(training.trainerName)}
                                            </td>
                                            <td className="Polaris-DataTable__Cell perk-table-s2">
                                                {getCellValue(training.status)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="Polaris-DataTable__TableRow">
                                        <td
                                            colSpan={10}
                                            className="Polaris-DataTable__Cell text-center"
                                        >
                                            No assigned training records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>


                {/* Pagination */}
                <Pagination
                    currentPage={pageNumber}
                    totalRecords={totalRecords}
                    pageSize={filterSelect}
                    currentDataLength={trainingData.length}
                    pageSizeOptions={[10, 25, 50, 100, 200, 500]}
                    onPageChange={handlePaginationChange}
                    onPageSizeChange={handlePageSizeChange}
                    showEntryCount={true}
                    showPageSize={true}
                />
            </div>
        </div>
    );
}

export default AssignTraining;
