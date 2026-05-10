// 🏛️ Lógica Global - Prefeitura Municipal
document.addEventListener('DOMContentLoaded', () => {
    console.log('Sistema Municipal iniciado.');
    
    // Aqui podemos adicionar animações de entrada para os cards
    const cards = document.querySelectorAll('.card-module');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.4s ease-out';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
});
