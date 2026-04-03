(function () {
    function initFloatingWhatsapp() {
        const floatingWhatsapp = document.querySelector('.floating-whatsapp');
        if (!floatingWhatsapp) {
            return;
        }

        const updateVisibility = () => {
            const revealAfter = Math.min(window.innerHeight * 0.45, 320);
            floatingWhatsapp.classList.toggle('is-visible', window.scrollY > revealAfter);
        };

        updateVisibility();
        window.addEventListener('scroll', updateVisibility, { passive: true });
        window.addEventListener('resize', updateVisibility);
    }

    function init(config) {
        if (
            window.DynastyHomeBooking &&
            typeof window.DynastyHomeBooking.init === 'function'
        ) {
            window.DynastyHomeBooking.init(config);
        }

        initFloatingWhatsapp();
    }

    window.DynastyHome = {
        init
    };
})();
