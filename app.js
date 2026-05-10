// Lógica Principal - Prefeitura (Cidade Presente)

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btn = loginForm.querySelector('button');

            // Feedback Visual de Carregamento
            const originalText = btn.innerText;
            btn.innerText = 'Autenticando...';
            btn.disabled = true;

            try {
                // Simulação de autenticação (Integração futura com Supabase)
                console.log('Tentativa de login:', email);
                
                // Simula um delay de rede
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Redirecionamento bem-sucedido
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error('Erro no login:', error);
                btn.innerText = originalText;
                btn.disabled = false;
                alert('Erro ao realizar login. Verifique suas credenciais.');
            }
        });
    }
});
