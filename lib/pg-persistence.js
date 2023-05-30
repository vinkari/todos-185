const { dbQuery } = require("./db-query");
const bcrypt = require("bcrypt");

module.exports = class PgPersistence {
  constructor(session) {
    this.username = session.username;
  }
  
  isDoneTodoList(todoList) {
    return todoList.todos.length > 0 && todoList.todos.every(todo => todo.done);
  }

  isUniqueConstraintViolation(error) {
    return /duplicate key value violates unique constraint/.test(String(error));
  }

  async loadTodoList(todoListId) {
    const FIND_TODOLIST = "SELECT * FROM todolists WHERE id = $1 AND username = $2";
    const FIND_SORTED_TODOS = "SELECT * FROM todos WHERE todolist_id = $1 AND username = $2 ORDER BY done ASC, lower(title) ASC";

    let resultTodoList = await dbQuery(FIND_TODOLIST, todoListId, this.username);
    let todoList = resultTodoList.rows[0];
    if (!todoList) return undefined;

    let resultTodos = await dbQuery(FIND_SORTED_TODOS, todoListId, this.username);
    todoList.todos = resultTodos.rows;

    return todoList;
  }

  async loadTodo(todoListId, todoId) {
    const FIND_TODO = "SELECT * FROM todos WHERE todolist_id = $1 and id = $2 AND username = $3";

    let result = await dbQuery(FIND_TODO, todoListId, todoId, this.username);
    return result.rows[0];
  }

  async sortedTodoLists() {
    const ALL_TODOLISTS = "SELECT * FROM todolists WHERE username = $1 ORDER BY lower(title) ASC";
    const ALL_TODOS = "SELECT * FROM todos WHERE username = $1";

    let resultTodoLists = dbQuery(ALL_TODOLISTS, this.username);
    let resultTodos = dbQuery(ALL_TODOS, this.username);
    let resultBoth = await Promise.all([resultTodoLists, resultTodos]);

    let allTodoLists = resultBoth[0].rows;
    let allTodos = resultBoth[1].rows;
    if (!allTodoLists || !allTodos) return undefined;

    allTodoLists.forEach(todoList => {
      todoList.todos = allTodos.filter(todo => todo.todolist_id === todoList.id);
    });

    return this._partitionTodoLists(allTodoLists);
  }

  _partitionTodoLists(todoLists) {
    let undone = [];
    let done = [];

    todoLists.forEach(todoList => {
      this.isDoneTodoList(todoList) ? done.push(todoList) : undone.push(todoList);
    });

    return undone.concat(done);
  }

  async toggleDoneTodo(todoListId, todoId) {
    const TOGGLE_DONE = "UPDATE todos SET done = NOT done" +
                        "  WHERE todolist_id = $1 AND id = $2 AND username = $3";
    
    let result = await dbQuery(TOGGLE_DONE, todoListId, todoId, this.username);
    return result.rowCount > 0;
  }

  async deleteTodo(todoListId, todoId) {
    const DELETE_TODO = "DELETE FROM todos WHERE todolist_id = $1 AND id = $2 AND username = $3";

    let result = await dbQuery(DELETE_TODO, todoListId, todoId, this.username);
    return result.rowCount > 0;
  }

  async completeAllTodos(todoListId) {
    const COMPLETE_ALL = "UPDATE todos SET done = true WHERE todolist_id = $1 AND done = false AND username = $2";

    let result = await dbQuery(COMPLETE_ALL, todoListId, this.username);
    return result.rowCount > 0;
  }

  async createTodo(todoListId, title) {
    const CREATE_TODO = "INSERT INTO todos (todolist_id, title, username) VALUES ($1, $2, $3)";

    let result = await dbQuery(CREATE_TODO, todoListId, title, this.username);
    return result.rowCount > 0;
  }

  async deleteTodoList(todoListId) {
    console.log(todoListId);
    const DELETE_TODOLIST = "DELETE FROM todolists WHERE id = $1 AND username = $2";

    let result = await dbQuery(DELETE_TODOLIST, todoListId, this.username);
    return result.rowCount > 0;
  }

  async renameTodoList(todoListId, todoListTitle) {
    const RENAME_TODOLIST = "UPDATE todolists SET title = $2 WHERE id = $1 AND username = $3";

    let result = await dbQuery(RENAME_TODOLIST, todoListId, todoListTitle, this.username);
    return result.rowCount > 0;
  }

  async existsTodoListTitle(todoListTitle) {
    const FIND_TODOLIST = "SELECT * FROM todolists WHERE title = $1 AND username = $2";

    let result = await dbQuery(FIND_TODOLIST, todoListTitle, this.username);
    return result.rowCount > 0;
  }

  async createTodoList(title) {
    const CREATE_TODOLIST = "INSERT INTO todolists (title, username) VALUES ($1, $2)";

    try {
      let result = await dbQuery(CREATE_TODOLIST, title, this.username);
      return result.rowCount > 0;
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) return false;
      throw error;
    }
  }

  async isAuthorizedUser (username, password) {
    const FIND_HASHED_PASSWORD = "SELECT * FROM users WHERE username = $1";

    let result = await dbQuery(FIND_HASHED_PASSWORD, username);
    if (result.rowCount === 0) return false;

    return bcrypt.compare(password, result.rows[0].password);
  }
};