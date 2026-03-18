// Dynasty Prestige - minimal interactivity

// Mobile navigation toggle
function toggleNav() {
    var nav = document.querySelector('.nav');
    if (nav) nav.classList.toggle('is-open');
}

// Smooth scroll for in-page anchor links
document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var targetId = link.getAttribute('href').slice(1);
    var target = document.getElementById(targetId);
    if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var nav = document.querySelector('.nav');
        if (nav && nav.classList.contains('is-open')) {
            nav.classList.remove('is-open');
        }
    }
});

