const SeedData = require("./seed-data");
const deepCopy = require("./deep-copy");
const { sortTodoLists, sortTodos } = require("./sort");
const nextId = require("./next-id");

module.exports = class SessionPersistence {
  constructor(session) {
    this._todoLists = session.todoLists || deepCopy(SeedData);
    session.todoLists = this._todoLists;
  }

  // Are all of the todos in the todo list done? If the todo list has at least
  // one todo and all of its todos are marked as done, then the todo list is
  // done. Otherwise, it is undone.
  isDoneTodoList(todoList) {
    return todoList.todos.length > 0 && todoList.todos.every(todo => todo.done);
  }

  loadTodoList(todoListId) {
    let todoList = this._getTodoList(todoListId);
    return deepCopy(todoList);
  }

  loadTodo(todoListId, todoId) {
    let todo = this._getTodo(todoListId, todoId);
    return deepCopy(todo);
  }

  // Return the list of todo lists sorted by completion status and title (case-insensitive).
  sortedTodoLists() {
    let todoLists = deepCopy(this._todoLists);
    let undone = todoLists.filter(todoList => !this.isDoneTodoList(todoList));
    let done = todoLists.filter(todoList => this.isDoneTodoList(todoList));
    return sortTodoLists(undone, done);
  }

  sortedTodos(todoList) {
    let undone = todoList.todos.filter(todo => !todo.done);
    let done = todoList.todos.filter(todo => todo.done);
    return sortTodos(undone, done);
  }

  _getTodoList (todoListId) {
    return this._todoLists.find(todoList => todoList.id === todoListId);
  }

  _getTodo (todoListId, todoId) {
    let todoList = this._getTodoList(todoListId);
    return todoList.todos.find(todo => todo.id === todoId);
  }

  deleteTodo(todoListId, todoId) {
    let todoList = this._getTodoList(todoListId);
    if (!todoList) return false;

    let todoIndex = todoList.todos.findIndex(todo => todo.id === todoId);
    if (todoIndex === -1) return false;

    todoList.todos.splice(todoIndex, 1);
    return true;
  }

  markTodoDone(todoListId, todoId) {
    let todo = this._getTodo(todoListId, todoId);
    todo.done = true;
  }

  markTodoUndone(todoListId, todoId) {
    let todo = this._getTodo(todoListId, todoId);
    todo.done = false;
  }

  completeAllTodos(todoListId) {
    let todoList = this._getTodoList(todoListId);
    if (!todoList) return false;

    todoList.todos.forEach(todo => todo.done = true);
    return true;
  }

  createTodo(todoListId, title) {
    let todoList = this._getTodoList(todoListId);
    if (!todoList) return false;

    todoList.todos.push({
      id: nextId(),
      title,
      done: false
    });

    return true;
  }

  deleteTodoList(todoListId) {
    let todoListIndex = this._todoLists.findIndex(todoList => todoList.id === todoListId);
    if (todoListIndex === -1) return false;

    this._todoLists.splice(todoListIndex, 1);
    return true;
  }

  renameTodoList(todoListId, todoListTitle) {
    let todoList = this._getTodoList(todoListId);
    if (!todoList) return false;

    todoList.title = todoListTitle;
    return true;
  }

  existsTodoListTitle(todoListTitle) {
    return this._todoLists.some(todoList => todoList.title === todoListTitle);
  }

  createTodoList(title) {
    this._todoLists.push({
      id: nextId(),
      title,
      todos: []
    });
  }
};