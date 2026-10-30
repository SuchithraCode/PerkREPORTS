import axios from "axios";
export const getAssignCompOffPolicyReport = async (
    requestId,
    pageNumber,
    filterSelect
) => {
    const response = await axios.get(
        `/api/Leaves/assigncompoffpolicy/${encodeURIComponent(
            requestId
        )}?pageNumber=${pageNumber}&filterSelect=${filterSelect}`
    );

    console.log("response", response.data);
    return response.data;
};

export const exportAssignCompOffPolicy = (
    requestId,
    exportType
) => {
    window.open(
        `/api/Leaves/assigncompoffpolicy/export/${encodeURIComponent(
            requestId
        )}?type=${exportType}`,
        "_blank"
    );
};