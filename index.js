require("dotenv").config();

const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

const {Paciente, Usuario} = require('./models');

//Rotas Públicas
app.get('/', (req, res) => {
  res.send('Seja bem-vindo a nossa API de clínica!');
});

app.post('/pacientes', async (req, res) => {
    try {
        const novoPaciente = await Paciente.create(req.body);
        res.status(201).json(novoPaciente);
    } catch (error) {
        res.status(400).json({ mensagem: 'Erro ao criar paciente.', erro: error.message });
    }
});

// Rota de Login para gerar o token
app.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;

    try {
        const user = await Usuario.findOne({ where: { usuario: usuario } });

        if (!user) {
        
            return res.status(401).json({ mensagem: 'Usuário ou senha inválidos.' });
        }

        const senhaCorreta = (user.senha === senha);
        
        if (!senhaCorreta) {
            return res.status(401).json({ mensagem: 'Usuário ou senha inválidos.' });
        }

        const token = jwt.sign({ userId: user.id, usuario: user.usuario }, JWT_SECRET, { expiresIn: '20m' }); 

        return res.json({ mensagem: 'Login bem-sucedido!', token: token });

    } catch (error) {
        console.error('Erro no login:', error);
        return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
    }
});

// Middleware para verificação do JWT
function verificaJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ mensagem: 'Token de autenticação não fornecido.' });
    }
    
    const token = authHeader.split(' ')[1]; 

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ mensagem: 'Token expirado.' });
            }
            return res.status(401).json({ mensagem: 'Token inválido.' });
        }
        
        req.usuarioLogado = decoded;
        next(); 
    });
}

app.get('/pacientes', verificaJWT, async (req, res) => {
    try {
        console.log('Acessado por:', req.usuarioLogado);

        const listaPacientes = await Paciente.findAll(); 

        res.json({
            mensagem: `Lista de pacientes recuperada.`,
            pacientes: listaPacientes
        });
    } catch (error) {
        console.error('Erro ao buscar pacientes:', error);
        res.status(500).json({ mensagem: 'Erro do servidor.' });
    }
});

app.get('/pacientes/:id', verificaJWT, async (req, res) => {
    try {
        const paciente = await Paciente.findByPk(req.params.id); 
        if (!paciente) {
            return res.status(404).json({ mensagem: 'Paciente não encontrado.' });
        }
        res.status(200).json(paciente);
    } catch (error) {
        res.status(500).json({ mensagem: 'Erro ao buscar paciente.' });
    }
});


//Atualizar um paciente 
app.put('/pacientes/:id', verificaJWT, async (req, res) => {
    try {
        const paciente = await Paciente.findByPk(req.params.id);
        if (!paciente) {
            return res.status(404).json({ mensagem: 'Paciente não encontrado.' });
        }
        await paciente.update(req.body);
        res.status(200).json(paciente);
    } catch (error) {
        res.status(400).json({ mensagem: 'Erro ao atualizar paciente.', erro: error.message });
    }
});

//Deletar um paciente
app.delete('/pacientes/:id', verificaJWT, async (req, res) => {
    try {
        const paciente = await Paciente.findByPk(req.params.id);
        if (!paciente) {
            return res.status(404).json({ mensagem: 'Paciente não encontrado.' });
        }
        await paciente.destroy();
        res.status(204).send(); 
    } catch (error) {
        res.status(500).json({ mensagem: 'Erro ao deletar paciente.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});