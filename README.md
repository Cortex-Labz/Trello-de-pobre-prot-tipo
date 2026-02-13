# 🚀 TaskFlow - Gerenciador de Tarefas Moderno

Um clone moderno e elegante do Trello, construído com HTML5, CSS3 e JavaScript vanilla. Interface dark mode com design system profissional, animações suaves e funcionalidade completa de drag-and-drop.

![TaskFlow](https://img.shields.io/badge/Status-Ready-success)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## ✨ Funcionalidades

### 🎯 Core Features
- **Drag & Drop**: Arraste cartões entre listas de forma fluida
- **Listas Personalizáveis**: Crie e organize múltiplas listas
- **Cartões Interativos**: Adicione, edite e gerencie tarefas
- **Labels Coloridas**: Organize por categorias com cores vibrantes
- **Avatares de Usuário**: Atribua tarefas a membros da equipe
- **Progresso Visual**: Barra de progresso para acompanhar tarefas
- **Contadores**: Visualize checklist, comentários e anexos

### 🎨 Design Moderno
- **Dark Mode**: Interface escura elegante e profissional
- **Glassmorphism**: Efeitos de vidro fosco modernos
- **Gradientes**: Cores vibrantes em degradê
- **Animações Suaves**: Transições e efeitos animados
- **Responsivo**: Funciona perfeitamente em desktop e mobile
- **Design System**: Cores e espaçamentos consistentes

### ⌨️ Atalhos de Teclado
- `Ctrl/Cmd + K` - Buscar cartões
- `Ctrl/Cmd + N` - Criar novo cartão
- `Ctrl/Cmd + L` - Criar nova lista

### 🔥 Interações
- **Clique**: Editar título do cartão
- **Duplo Clique**: Editar título da lista
- **Arrastar**: Mover cartões entre listas
- **Hover**: Efeitos visuais e destaque

## 🚀 Como Usar

### Instalação
1. Clone ou baixe os arquivos do projeto
2. Abra o arquivo `index.html` em seu navegador
3. Pronto! Não requer instalação ou servidor

### Estrutura de Arquivos
```
Trello de pobre/
├── index.html      # Estrutura HTML
├── styles.css      # Design e estilos
├── script.js       # Funcionalidades interativas
└── README.md       # Documentação
```

## 📖 Guia de Uso

### Criando uma Nova Lista
1. Clique no botão "Nova Lista" no topo
2. OU clique em "Adicionar outra lista" no final
3. Digite o nome da lista
4. Pressione Enter ou OK

### Adicionando Cartões
1. Clique em "Adicionar cartão" na lista desejada
2. Digite o título do cartão
3. Pressione Enter ou OK

### Movendo Cartões
1. Clique e segure em um cartão
2. Arraste para a posição desejada
3. Solte para fixar na nova posição

### Editando
- **Cartão**: Clique no cartão para editar o título
- **Lista**: Clique duas vezes no título da lista para editar

### Buscando
1. Clique no ícone de busca (🔍) ou pressione `Ctrl+K`
2. Digite o termo de busca
3. Os cartões correspondentes serão destacados

## 🎨 Personalização

### Cores das Labels
As labels possuem cores pré-definidas:
- 🔴 **Vermelho**: Urgente/Crítico
- 🔵 **Azul**: Design/Interface
- 🟢 **Verde**: Feature/Novo
- 🟡 **Amarelo**: Prioridade/Atenção
- 🟣 **Roxo**: Backend/Técnico

### Modificando o Design
Todas as variáveis de design estão centralizadas no início do `styles.css`:

```css
:root {
    --primary: #6366f1;
    --secondary: #8b5cf6;
    --accent: #ec4899;
    /* ... */
}
```

## 🛠️ Tecnologias

- **HTML5**: Estrutura semântica moderna
- **CSS3**:
  - Custom Properties (CSS Variables)
  - Flexbox & Grid
  - Animations & Transitions
  - Backdrop Filter (Glassmorphism)
- **JavaScript (ES6+)**:
  - Drag & Drop API
  - Local Storage
  - Event Delegation
  - Module Pattern

## 🔧 Funcionalidades Técnicas

### Persistência de Dados
- Auto-save a cada 5 segundos
- Armazenamento no Local Storage
- Restauração automática ao recarregar

### Performance
- Animações otimizadas com CSS
- Event delegation para melhor performance
- Lazy loading de interações

### Acessibilidade
- Contraste adequado de cores
- Atalhos de teclado
- Feedback visual claro
- Estrutura semântica

## 📱 Responsividade

O layout se adapta automaticamente para:
- **Desktop**: Layout horizontal com scroll
- **Tablet**: Layout otimizado para touch
- **Mobile**: Layout vertical empilhado

## 🎯 Próximas Funcionalidades

Ideias para expansão futura:
- [ ] Modal completo de edição de cartão
- [ ] Sistema de comentários
- [ ] Upload de anexos
- [ ] Data de vencimento com alertas
- [ ] Filtros e ordenação
- [ ] Múltiplos boards
- [ ] Modo colaborativo (WebSocket)
- [ ] Exportar para PDF/JSON
- [ ] Temas personalizados
- [ ] Notificações push

## 💡 Dicas de Uso

1. **Organize por Status**: Use listas como "A Fazer", "Em Progresso", "Revisão", "Concluído"
2. **Use Labels**: Categorize por tipo, prioridade ou departamento
3. **Atribua Tarefas**: Adicione avatares para responsabilidade clara
4. **Mantenha Atualizado**: Use a barra de progresso para acompanhar o andamento
5. **Busque Rápido**: Use `Ctrl+K` para encontrar qualquer cartão

## 🤝 Contribuindo

Sinta-se livre para:
- Reportar bugs
- Sugerir novas funcionalidades
- Fazer fork do projeto
- Enviar pull requests

## 📄 Licença

Este projeto é open-source e está disponível para uso pessoal e comercial.

## 🎨 Créditos

- **Ícones**: SVG inline personalizados
- **Avatares**: [DiceBear Avatars](https://avatars.dicebear.com/)
- **Inspiração**: Trello, Notion, Linear

---

Desenvolvido com ❤️

**Versão**: 1.0.0
**Última atualização**: Outubro 2025
