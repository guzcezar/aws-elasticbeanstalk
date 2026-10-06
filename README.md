# Study Sync

Aplicação de perguntas sobre AWS usada como prova de conceito com Node.js, PostgreSQL e AWS Elastic Beanstalk. O navegador mostra uma pergunta por vez; as respostas e a pontuação são armazenadas no PostgreSQL.

> **Escopo:** todos os visitantes compartilham as mesmas respostas e a mesma pontuação. Os endpoints não têm autenticação. Use este projeto como demonstração, não como um quiz público com dados individuais.

## Requisitos

- Node.js e npm
- Docker com Docker Compose, para executar o PostgreSQL localmente
- EB CLI e uma conta AWS configurada, apenas se quiser experimentar um deploy

## Executar localmente

1. Inicie o banco:

   ```sh
   docker compose up -d db
   ```

   Aguarde o PostgreSQL ficar pronto antes de seguir. Você pode conferir com `docker compose exec -T db pg_isready -U postgres`.

2. Crie o banco `study-sync` e carregue o esquema e as perguntas de exemplo:

   ```sh
   docker compose exec -T db psql -U postgres -d postgres -c 'CREATE DATABASE "study-sync";'
   docker compose exec -T db psql -U postgres -d study-sync < src/sql/schema.sql
   docker compose exec -T db psql -U postgres -d study-sync < src/sql/seed.sql
   ```

   Execute esses comandos apenas na primeira configuração. **`schema.sql` remove e recria as tabelas `answers` e `questions`**, apagando os dados existentes. Se o banco já existir, pule o primeiro comando.

3. Instale as dependências e inicie a aplicação:

   ```sh
   npm ci
   DATABASE_URL='postgresql://postgres:password@localhost:5432/study-sync' PORT=4567 npm start
   ```

4. Abra `http://localhost:4567`.

O `npm start` usa `DATABASE_URL` para conectar ao PostgreSQL e `PORT` para a porta HTTP. Sem `PORT`, a aplicação usa `3000`. A senha `password` em `docker-compose.yml` serve somente para desenvolvimento local; configure outra credencial e restrinja o acesso ao banco em qualquer ambiente compartilhado.

Para parar o banco local sem apagar seus dados:

```sh
docker compose down
```

## Testes

```sh
npm test
```

Os testes cobrem os arquivos públicos, o fluxo de perguntas, envio e reset, além da validação de entradas inválidas. Eles simulam o acesso ao banco e às rotas; não substituem um teste de integração com PostgreSQL e HTTP reais.

## API

| Método | Caminho | Função |
| --- | --- | --- |
| `GET` | `/questions` | Retorna as perguntas, a próxima pergunta e a pontuação compartilhada. |
| `PUT` | `/submit` | Registra uma resposta. Recebe JSON com `question_uuid` e `choice` (`A`, `B`, `C` ou `D`). |
| `PUT` | `/reset` | Apaga todas as respostas registradas. |

Exemplo de envio, usando o `question_index` retornado por `GET /questions`:

```sh
curl -X PUT http://localhost:4567/submit \
  -H 'Content-Type: application/json' \
  -d '{"question_uuid":"UUID_DA_PERGUNTA","choice":"B"}'
```

## Estrutura do projeto

| Caminho | Responsabilidade |
| --- | --- |
| `src/server/index.js` | Lê a configuração, conecta ao banco e inicia o servidor. |
| `src/server/app.js` | Monta o Express e entrega os arquivos da interface. |
| `src/server/quiz/routes.js` | Define as rotas HTTP e valida as respostas. |
| `src/server/quiz/service.js` | Coordena o fluxo do quiz e calcula se a resposta está correta. |
| `src/server/quiz/repository.js` | Executa as consultas do quiz no PostgreSQL. |
| `src/public/` | HTML, CSS e JavaScript executados no navegador. |
| `src/sql/schema.sql`, `seed.sql` | Esquema e perguntas de exemplo. |
| `test/service.test.js` | Testes dos fluxos do quiz com dependências simuladas. |

As rotas chamam o serviço, que usa o repositório para acessar os dados. A interface usa somente a API HTTP. Isso permite testar as regras sem iniciar o banco ou o servidor real.

## Elastic Beanstalk

Este repositório contém o código da aplicação, mas não provisiona RDS, rede, políticas IAM ou segredos. Para experimentar um deploy:

1. Configure uma instância PostgreSQL acessível **somente** às instâncias da aplicação e carregue `src/sql/schema.sql` e `src/sql/seed.sql` nesse banco. Não execute novamente `schema.sql` depois que houver dados a preservar.
2. Defina `DATABASE_URL` no ambiente do Elastic Beanstalk, preferencialmente a partir do AWS Secrets Manager ou Systems Manager Parameter Store. Não grave a URL com senha no repositório. O aplicativo lê `PORT` da plataforma automaticamente.
3. Inicialize o projeto com `eb init`, crie um ambiente Node.js com `eb create` e publique as alterações com `eb deploy`. Configure o banco e `DATABASE_URL` como parte da criação do ambiente; sem a variável, o servidor não inicia.

O Elastic Beanstalk usa `npm start` quando encontra `package.json` sem `Procfile`. Consulte a documentação da AWS para [plataforma Node.js](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_nodejs.container.html), [EB CLI](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3.html) e [segredos em variáveis de ambiente](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/AWSHowTo.secrets.env-vars.html).
