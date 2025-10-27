# page_cmd_clandestino

# 🎃 Torneio de Commander (EDH) - Gerenciador de Mesas e Análise de Decks

[![GitHub Pages](https://github.githubassets.com/images/modules/site/features/pages-logo-small.svg)](https://docs.github.com/pt/pages/getting-started-with-github-pages/creating-a-github-pages-site)
[![Feito com HTML, CSS e JavaScript](https://img.shields.io/badge/Tecnologias-HTML%20%7C%20CSS%20%7C%20JS-blue)](https://developer.mozilla.org/pt-BR/docs/Web)

## 🧙 Sobre o Projeto

Este é um *Web Application* simples, autônomo (não requer backend) e temático para gerenciar torneios casuais de *Magic: The Gathering* no formato Commander (EDH).

O foco principal é garantir a **justiça e o balanceamento** das mesas, utilizando um sistema de Power Level simulado e aplicando um algoritmo de balanceamento (usando Power Level e Embaralhamento) antes de sortear as mesas de 4 jogadores.

Toda a persistência de dados (jogadores, decks, resultados) é feita localmente no navegador (`localStorage`), tornando a aplicação ideal para uso em eventos ou reuniões sem a necessidade de um servidor.

---

## ✨ Funcionalidades Principais

1.  **Cadastro Completo:** Gerencie jogadores e seus respectivos Decks (com link para LigaMagic ou similar).
2.  **Análise e Power Level:** Simulação de uma "IA" que atribui um Power Level (1-10) e Bracket (Casual, Focused, Optimized, Competitive) para cada Deck cadastrado, baseando-se em métricas simuladas de sinergia, consistência e resiliência.
3.  **Sorteio de Mesas Balanceado:**
    * Ordena os jogadores com base no Power Level do seu Deck.
    * Utiliza um algoritmo de intercalação (alto PL com baixo PL) e embaralhamento para gerar mesas de 4 jogadores de forma justa e aleatória a cada rodada.
    * Identifica automaticamente jogadores que ficam de *Bye* (e atribui 3 pontos).
4.  **Cronômetro de Rodada:** Inclui um cronômetro regressivo de 60 minutos na aba "Mesas" para controle de tempo.
5.  **Registro de Resultados:** Permite registrar o vencedor de cada mesa e avançar para a próxima rodada.
6.  **Ranking e Estatísticas:** Gera um ranking automático com pontuação, vitórias, empates, derrotas e byes.
7.  **Visualização de Dados:** Exibe um gráfico de distribuição de Power Levels e uma análise detalhada para cada Deck.

## 🛠️ Como Usar (Para Organizar um Torneio)

1.  **Acesse a Página:** Abra o site no seu navegador (de preferência, um computador ou tablet para melhor visualização).
2.  **Aba Jogadores:**
    * Cadastre todos os participantes do torneio.
    
    <img width="1171" height="425" alt="{4173A43C-C233-416B-8E61-93356203BC40}" src="https://github.com/user-attachments/assets/90b0d660-d6ae-4f6d-87e0-8cfd21a145e7" />


3.  **Aba Decks:**
    * Associe um Deck a cada jogador, fornecendo o nome e o link da lista.
    * A aplicação irá gerar automaticamente o **Power Level** simulado.
    * Utilize o botão **"Analisar Todos os Decks"** para atualizar as análises.
    
    <img width="1171" height="436" alt="{11C313FE-DD69-4D21-8E1C-24C88F751F98}" src="https://github.com/user-attachments/assets/ce2558da-510b-4157-ab35-a38a940a22f4" />

4.  **Aba Mesas (Rodada 1):**
    * Clique em **"Sortear Mesas"**.
    * As mesas balanceadas serão exibidas, juntamente com os jogadores que ficaram de Bye.
    * Utilize o **Cronômetro** para controlar o tempo da rodada (padrão 60 minutos).

    <img width="1171" height="416" alt="{B84B8CD2-D10E-4F5F-B188-25158B56D7A3}" src="https://github.com/user-attachments/assets/844fc964-164b-43fd-9656-e63e8396f246" />

5.  **Aba Resultados:**
    * Ao final da rodada, selecione a mesa no menu.
    * Marque o **Vencedor** (apenas um por mesa é permitido) e registre os resultados.
    * O ranking e a rodada avançam automaticamente.

    <img width="1173" height="328" alt="{2A27E770-4153-4D23-B52D-71C515FCC196}" src="https://github.com/user-attachments/assets/1c8f0833-3ced-4f31-9bb5-7132879b20f8" />

6.  **Aba Ranking e Análise:**
    * Acompanhe a classificação em tempo real e verifique as estatísticas dos Decks.

    <img width="1005" height="551" alt="{30FD88D8-3440-4E8A-8CE8-DB7FAC73B6B7}" src="https://github.com/user-attachments/assets/f016f368-e47c-4e82-a12c-f7aaa8bc5b77" />


## ⚙️ Configuração (Para Desenvolvedores)

A aplicação é um **projeto *single-page*** contido separadamente nos arquivo `index.html,style.css,script.js`.

Não há dependências de `npm` ou servidor. As únicas bibliotecas externas utilizadas são:
* [Bootstrap 5.3](https://getbootstrap.com/) (CSS e JS)
* [Font Awesome](https://fontawesome.com/) (Ícones)
* [Chart.js](https://www.chartjs.org/) (Gráficos)

Para hospedar:
1.  Faça o *fork* ou clone o repositório.
2.  Publique o arquivo `index.html` usando o **GitHub Pages**.

---

## 👨‍💻 Créditos

* **Desenvolvimento:** [Glaucion Sousa/GlaucionSousa]
* **Tema:** Inspirado no estilo Halloween, mas usual em outros momentos.
* **Ferramentas:** [Bootstrap], [Chart.js].
