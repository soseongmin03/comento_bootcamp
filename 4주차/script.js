const state = {
  members: [],
  todos: [],
  lastCheckedUserId: "",
};

function requireElement(selector) {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`Required element is missing: ${selector}`);
  }

  return element;
}

const elements = {
  signupForm: requireElement("[data-signup-form]"),
  userIdInput: requireElement("[data-user-id-input]"),
  passwordInput: requireElement("[data-password-input]"),
  checkIdButton: requireElement("[data-check-id-button]"),
  idMessage: requireElement("[data-id-message]"),
  passwordMessage: requireElement("[data-password-message]"),
  memberList: requireElement("[data-member-list]"),
  memberEmpty: requireElement("[data-member-empty]"),
  memberCount: requireElement("[data-member-count]"),
  todoForm: requireElement("[data-todo-form]"),
  todoInput: requireElement("[data-todo-input]"),
  todoList: requireElement("[data-todo-list]"),
  todoEmpty: requireElement("[data-todo-empty]"),
  todoCount: requireElement("[data-todo-count]"),
  statusMessage: requireElement("[data-status-message]"),
  toast: requireElement(".toast"),
  passwordRules: {
    length: requireElement('[data-rule="length"]'),
    letter: requireElement('[data-rule="letter"]'),
    number: requireElement('[data-rule="number"]'),
    special: requireElement('[data-rule="special"]'),
    space: requireElement('[data-rule="space"]'),
  },
};

function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value) {
  return value.trim();
}

function setLastCheckedUserId(userId) {
  state.lastCheckedUserId = userId;
}

function addMember(member) {
  state.members = [...state.members, member];
}

function addTodo(todo) {
  state.todos = [...state.todos, todo];
}

function removeTodoById(todoId) {
  state.todos = state.todos.filter((todo) => todo.id !== todoId);
}

function setStatus(message, type = "default") {
  elements.statusMessage.textContent = message;
  elements.toast.classList.remove("toast--success", "toast--warning", "toast--danger");

  if (type !== "default") {
    elements.toast.classList.add(`toast--${type}`);
  }
}

function setFieldMessage(element, message, type = "default") {
  element.textContent = message;
  element.classList.remove("field__message--success", "field__message--danger");

  if (type !== "default") {
    element.classList.add(`field__message--${type}`);
  }
}

function isDuplicatedUserId(userId) {
  return state.members.some((member) => member.userId === userId);
}

function validatePassword(password) {
  return {
    length: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9\s]/.test(password),
    space: !/\s/.test(password),
  };
}

function isPasswordValid(password) {
  const result = validatePassword(password);
  return Object.values(result).every(Boolean);
}

function updatePasswordRuleView(password) {
  const result = validatePassword(password);

  Object.entries(result).forEach(([ruleName, isPassed]) => {
    elements.passwordRules[ruleName].classList.toggle("rule-list__item--passed", isPassed);
  });

  if (password.length === 0) {
    setFieldMessage(elements.passwordMessage, "비밀번호 규칙을 확인합니다.");
    return;
  }

  if (Object.values(result).every(Boolean)) {
    setFieldMessage(elements.passwordMessage, "사용 가능한 비밀번호입니다.", "success");
    return;
  }

  setFieldMessage(elements.passwordMessage, "비밀번호 규칙을 모두 충족해야 합니다.", "danger");
}

function checkUserIdAvailability() {
  const userId = normalizeText(elements.userIdInput.value);

  if (!userId) {
    setLastCheckedUserId("");
    setFieldMessage(elements.idMessage, "아이디를 입력해 주세요.", "danger");
    setStatus("아이디 입력값이 없어 중복확인을 할 수 없습니다.", "warning");
    return false;
  }

  if (isDuplicatedUserId(userId)) {
    setLastCheckedUserId("");
    setFieldMessage(elements.idMessage, "이미 사용 중인 아이디입니다.", "danger");
    setStatus(`${userId} 아이디는 이미 가입되어 있습니다.`, "danger");
    return false;
  }

  setLastCheckedUserId(userId);
  setFieldMessage(elements.idMessage, "사용 가능한 아이디입니다.", "success");
  setStatus(`${userId} 아이디를 사용할 수 있습니다.`, "success");
  return true;
}

function renderMembers() {
  const fragment = document.createDocumentFragment();

  state.members.forEach((member, index) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const id = document.createElement("span");

    item.className = "member-list__item";
    name.className = "member-list__name";
    id.className = "member-list__id";

    name.textContent = `${index + 1}. ${member.name}`;
    id.textContent = `아이디: ${member.userId}`;

    item.append(name, id);
    fragment.appendChild(item);
  });

  elements.memberList.replaceChildren(fragment);
  elements.memberEmpty.hidden = state.members.length > 0;
  elements.memberCount.textContent = `${state.members.length}명`;
}

function renderTodos() {
  const newTodoIds = new Set(state.todos.map((todo) => todo.id));

  [...elements.todoList.children].forEach((item) => {
    if (!newTodoIds.has(item.dataset.todoId)) {
      item.remove();
    }
  });

  state.todos.forEach((todo, index) => {
    let item = elements.todoList.querySelector(`[data-todo-id="${todo.id}"]`);
    let content;
    let text;
    let date;
    let deleteButton;

    if (item) {
      content = item.querySelector(".todo-list__content");
      text = item.querySelector(".todo-list__text");
      date = item.querySelector(".todo-list__date");
      deleteButton = item.querySelector("[data-todo-delete-button]");
    } else {
      item = document.createElement("li");
      content = document.createElement("div");
      text = document.createElement("span");
      date = document.createElement("span");
      deleteButton = document.createElement("button");

      item.className = "todo-list__item";
      item.dataset.todoId = todo.id;
      content.className = "todo-list__content";
      text.className = "todo-list__text";
      date.className = "todo-list__date";
      deleteButton.className = "todo-list__delete";
      deleteButton.type = "button";
      deleteButton.dataset.todoDeleteButton = "";

      content.append(text, date);
      item.append(content, deleteButton);
    }

    text.textContent = `${index + 1}. ${todo.text}`;
    date.textContent = `등록일: ${todo.createdAt}`;
    deleteButton.textContent = "삭제";
    deleteButton.setAttribute("aria-label", `${todo.text} 일정 삭제`);
    elements.todoList.appendChild(item);
  });

  elements.todoEmpty.hidden = state.todos.length > 0;
  elements.todoCount.textContent = `${state.todos.length}개`;
}

function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function resetSignupForm() {
  elements.signupForm.reset();
  setLastCheckedUserId("");
  setFieldMessage(elements.idMessage, "아이디를 입력한 뒤 중복확인을 눌러주세요.");
  updatePasswordRuleView("");
}

function handleUserIdInput() {
  setLastCheckedUserId("");
  setFieldMessage(elements.idMessage, "아이디가 변경되었습니다. 다시 중복확인을 해주세요.");
}

function handlePasswordInput() {
  updatePasswordRuleView(elements.passwordInput.value);
}

function handleSignupSubmit(event) {
  event.preventDefault();

  const formData = new FormData(elements.signupForm);
  const userId = normalizeText(formData.get("userId"));
  const name = normalizeText(formData.get("name"));
  const password = formData.get("password");

  if (!userId || !name || !password) {
    setStatus("회원가입에 필요한 값을 모두 입력해 주세요.", "warning");
    return;
  }

  if (state.lastCheckedUserId !== userId || isDuplicatedUserId(userId)) {
    setFieldMessage(elements.idMessage, "아이디 중복확인을 먼저 완료해 주세요.", "danger");
    setStatus("아이디 중복확인이 필요합니다.", "warning");
    return;
  }

  if (!isPasswordValid(password)) {
    updatePasswordRuleView(password);
    setStatus("비밀번호 규칙을 모두 충족해야 회원가입할 수 있습니다.", "danger");
    return;
  }

  addMember({
    id: createId(),
    userId,
    name,
    password,
  });

  renderMembers();
  resetSignupForm();
  setStatus(`${name} 회원가입이 완료되었습니다.`, "success");
}

function handleTodoSubmit(event) {
  event.preventDefault();

  const todoText = normalizeText(elements.todoInput.value);

  if (!todoText) {
    setStatus("추가할 일정 내용을 입력해 주세요.", "warning");
    return;
  }

  addTodo({
    id: createId(),
    text: todoText,
    createdAt: formatDateTime(new Date()),
  });

  renderTodos();
  elements.todoForm.reset();
  elements.todoInput.focus();
  setStatus(`일정 "${todoText}"을 추가했습니다.`, "success");
}

function handleTodoDelete(event) {
  const deleteButton = event.target.closest("[data-todo-delete-button]");

  if (!deleteButton) {
    return;
  }

  const todoItem = deleteButton.closest("[data-todo-id]");
  const todoId = todoItem?.dataset.todoId;

  if (!todoId) {
    return;
  }

  const todo = state.todos.find((item) => item.id === todoId);
  removeTodoById(todoId);

  renderTodos();

  if (todo) {
    setStatus(`일정 "${todo.text}"을 삭제했습니다.`);
  }
}

function bindEvents() {
  elements.checkIdButton.addEventListener("click", checkUserIdAvailability);
  elements.userIdInput.addEventListener("input", handleUserIdInput);
  elements.passwordInput.addEventListener("input", handlePasswordInput);
  elements.signupForm.addEventListener("submit", handleSignupSubmit);
  elements.todoForm.addEventListener("submit", handleTodoSubmit);
  elements.todoList.addEventListener("click", handleTodoDelete);
}

function init() {
  renderMembers();
  renderTodos();
  updatePasswordRuleView("");
  bindEvents();
}

init();
