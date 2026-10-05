// Event Listeners Initialization
document.addEventListener('DOMContentLoaded', () => {
    const openModalBtn = document.getElementById('openModalBtn');
    const heroCtaBtn = document.getElementById('heroCtaBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalOverlay = document.getElementById('modalOverlay');
    const loginForm = document.getElementById('loginForm');

    // Trigger Modal
    if (openModalBtn) openModalBtn.addEventListener('click', openModal);
    if (heroCtaBtn) heroCtaBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

    // Outside click to close modal
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }

    // Form submission action
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            alert(`Logged in as: ${email}`);
            closeModal();
            loginForm.reset();
        });
    }
});