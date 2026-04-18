document.addEventListener("DOMContentLoaded", () => {
    const bookingForms = Array.from(document.querySelectorAll(".js-vehicle-booking-form"));

    if (!bookingForms.length) {
        return;
    }

    const searchParams = new URLSearchParams(window.location.search);

    function getDubaiDateString(offsetDays = 0) {
        const now = new Date();
        const dubaiNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Dubai" }));
        dubaiNow.setDate(dubaiNow.getDate() + offsetDays);

        const year = dubaiNow.getFullYear();
        const month = String(dubaiNow.getMonth() + 1).padStart(2, "0");
        const day = String(dubaiNow.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    bookingForms.forEach((form) => {
        const startDateInput = form.querySelector('input[name="startDate"]');
        const endDateInput = form.querySelector('input[name="endDate"]');
        const pickupTimeInput = form.querySelector('input[name="pickupTime"]');
        const dropoffTimeInput = form.querySelector('input[name="dropoffTime"]');

        if (!startDateInput || !endDateInput || !pickupTimeInput || !dropoffTimeInput) {
            return;
        }

        const today = getDubaiDateString(0);
        const defaultStart = searchParams.get("startDate") || getDubaiDateString(1);
        const defaultEnd = searchParams.get("endDate") || getDubaiDateString(2);
        const defaultPickupTime = searchParams.get("pickupTime") || "12:00";
        const defaultDropoffTime = searchParams.get("dropoffTime") || "12:00";

        startDateInput.min = today;
        endDateInput.min = today;

        if (!startDateInput.value) {
            startDateInput.value = defaultStart;
        }

        if (!endDateInput.value) {
            endDateInput.value = defaultEnd;
        }

        if (!pickupTimeInput.value) {
            pickupTimeInput.value = defaultPickupTime;
        }

        if (!dropoffTimeInput.value) {
            dropoffTimeInput.value = defaultDropoffTime;
        }

        function syncReturnMin() {
            endDateInput.min = startDateInput.value || today;

            if (endDateInput.value && startDateInput.value && endDateInput.value < startDateInput.value) {
                endDateInput.value = startDateInput.value;
            }
        }

        startDateInput.addEventListener("change", syncReturnMin);
        syncReturnMin();
    });
});
