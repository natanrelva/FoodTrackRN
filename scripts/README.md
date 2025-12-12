# Scripts de Automação

Esta pasta contém scripts para automatizar tarefas comuns do projeto FoodTrack.

## Scripts Disponíveis

### Setup Inicial

#### `setup.sh` (Linux/macOS)
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

#### `setup.ps1` (Windows)
```powershell
PowerShell -ExecutionPolicy Bypass -File scripts/setup.ps1
```

**O que fazem:**
- Verificam pré-requisitos (Node.js, pnpm, Docker)
- Instalam dependências
- Configuram variáveis de ambiente
- Iniciam serviços Docker
- Executam migrations do banco
- Fazem build dos packages compartilhados

## Pré-requisitos

- **Node.js** 18+
- **pnpm** 8+
- **Docker** & **Docker Compose**
- **Git**

## Uso

1. **Primeira vez no projeto:**
   ```bash
   # Execute o script de setup
   ./scripts/setup.sh
   ```

2. **Desenvolvimento diário:**
   ```bash
   # Inicie todas as aplicações
   pnpm dev
   ```

3. **Reset completo:**
   ```bash
   # Limpe tudo e reconfigure
   pnpm reset
   ```

## Troubleshooting

### Erro de Permissão (Linux/macOS)
```bash
chmod +x scripts/setup.sh
```

### Erro de Política de Execução (Windows)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Docker não está rodando
```bash
# Inicie o Docker Desktop ou serviço Docker
sudo systemctl start docker  # Linux
```

### Porta em uso
```bash
# Verifique processos usando as portas
netstat -tulpn | grep :3000
# Mate o processo se necessário
kill -9 <PID>
```

## Contribuição

Para adicionar novos scripts:

1. Crie o script na pasta `scripts/`
2. Adicione documentação neste README
3. Teste em diferentes sistemas operacionais
4. Siga as convenções de nomenclatura existentes