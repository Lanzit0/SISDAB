const express = require("express");
const fs = require("fs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const PORT = 3000;
const path = require('path');

const SECRET = "segredo-simples";

app.use(express.json());
app.use(cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // outras configurações
}));

// Middleware para servir arquivos estáticos da pasta 'frontend'
app.use(express.static(path.join(__dirname, '../frontend')));

// Rota para o caminho raiz que serve o 'index.html'
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});


// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

const ADMIN = { usuario: "admin", senha: "1234" };

function autenticar(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.sendStatus(401);
  const token = auth.split(" ")[1];
  try {
    jwt.verify(token, SECRET);
    next();
  } catch {
    res.sendStatus(403);
  }
}

app.post("/login", (req, res) => {
  const { usuario, senha } = req.body;
  if (usuario === ADMIN.usuario && senha === ADMIN.senha) {
    const token = jwt.sign({ usuario }, SECRET);
    res.json({ token });
  } else {
    res.sendStatus(401);
  }
});

app.post("/denuncias", (req, res) => {
  const denuncia = req.body;
  denuncia.id = Date.now();

  let denuncias = [];
  if (fs.existsSync("data/denuncias.json")) {
    denuncias = JSON.parse(fs.readFileSync("data/denuncias.json"));
  }

  denuncias.push(denuncia);
  fs.writeFileSync("data/denuncias.json", JSON.stringify(denuncias, null, 2));
  res.status(201).json({ message: "Denúncia registrada." });
});

app.get("/painel", autenticar, (req, res) => {
  const tipo = req.query.tipo;
  const dataMin = req.query.data;

  let denuncias = [];
  if (fs.existsSync("data/denuncias.json")) {
    denuncias = JSON.parse(fs.readFileSync("data/denuncias.json"));
  }

  if (tipo) denuncias = denuncias.filter(d => d.tipo === tipo);
  if (dataMin) denuncias = denuncias.filter(d => d.data >= dataMin);

  res.json(denuncias);
});

// Atualizar status da denúncia
app.put("/denuncias/:id/status", autenticar, (req, res) => {
  const id = parseInt(req.params.id);
  const novoStatus = req.body.status;

  const filePath = path.join(__dirname, "data", "denuncias.json");

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Arquivo de denúncias não encontrado." });
  }

  const data = fs.readFileSync(filePath, "utf8");
  let denuncias;
  try {
    denuncias = JSON.parse(data);
    if (!Array.isArray(denuncias)) {
      throw new Error("Formato inválido: esperado um array de denúncias.");
    }
  } catch (err) {
    return res.status(500).json({ message: "Erro ao processar o arquivo de denúncias." });
  }

  const denuncia = denuncias.find((d) => d.id === id);
  if (!denuncia) {
    return res.status(404).json({ message: "Denúncia não encontrada." });
  }

  denuncia.status = novoStatus;

  fs.writeFileSync(filePath, JSON.stringify(denuncias, null, 2));
  res.json({ message: "Status atualizado com sucesso." });
});


app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
