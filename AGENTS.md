# AGENTS.md

## Contexto do projeto
- Este é um site de barbearia feito com HTML, CSS, JavaScript, Supabase e Mercado Pago.

## Diretrizes de alteração
- Preserve o visual atual do site.
- Faça alterações pequenas e fáceis de revisar.
- Não reescreva o projeto inteiro sem necessidade.
- Não remova funcionalidades existentes sem explicar.

## Segurança
- Não exponha chaves secretas no front-end.
- Mercado Pago access token nunca deve ficar em JavaScript público.
- Supabase service role key nunca deve ficar no front-end.
- Supabase anon key pode ser pública, mas as regras de segurança devem vir de RLS.

## Regras de agendamento
- Sempre que mexer em agendamentos, considerar funcionamento das 08:00 às 20:00.
- Pausa de almoço: 12:00 às 13:00.
- Duração padrão do corte: 45 minutos.
- Impedir colisão de horários.
- Usar horário de São Paulo.

## Área administrativa
- Área admin deve usar autenticação segura.
