import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configuração da API Payevo
const PAYEVO_API_URL = 'https://apiv2.payevo.com.br/functions/v1/transactions';
const PAYEVO_SECRET_KEY = process.env.PAYEVO_SECRET_KEY;

/**
 * Conforme a documentação da Payevo:
 * A autenticação é Basic Auth usando a SECRET_KEY como username e senha vazia.
 */
const getAuthHeader = () => {
    const auth = Buffer.from(`${PAYEVO_SECRET_KEY}:`).toString('base64');
    return {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'accept': 'application/json'
    };
};

// Rota genérica para processar pagamentos (PIX, CARD, BOLETO)
// O frontend envia para /api/payments/pix, /api/payments/credit-card, etc.
app.post('/api/payments/:method', async (req, res) => {
    const { method } = req.params;
    const payload = req.body;

    console.log(`[${new Date().toISOString()}] Recebendo requisição de pagamento via: ${method}`);
    
    try {
        /**
         * A API da Payevo v2 utiliza um único endpoint para criar transações.
         * O tipo de pagamento é definido pelo campo 'paymentMethod' no payload.
         * 
         * Formatos esperados no payload:
         * - paymentMethod: 'PIX', 'CARD' ou 'BOLETO'
         * - amount: valor em centavos (ex: 1000 para R$ 10,00)
         * - customer: objeto com dados do cliente
         * - items: array de itens
         */
        
        const response = await axios.post(PAYEVO_API_URL, payload, {
            headers: getAuthHeader()
        });

        console.log('Sucesso na Payevo:', response.data.id);
        res.status(200).json(response.data);
    } catch (error) {
        const errorData = error.response?.data;
        console.error('Erro na integração com Payevo:', JSON.stringify(errorData || error.message, null, 2));
        
        res.status(error.response?.status || 500).json(errorData || { 
            message: 'Erro interno no servidor ao processar pagamento' 
        });
    }
});

// Rota de verificação de saúde
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

app.listen(PORT, () => {
    console.log(`Servidor de Checkout Payevo rodando na porta ${PORT}`);
    console.log(`Endpoint de pagamento: http://localhost:${PORT}/api/payments/:method`);
});
