/**
 * @typedef User
 * @prop {string} username - unique string identifier
 * @prop {string} password - user's password
 */

/**
 * @class Users
 * invariant: usersById and usersByName always remain compatible
 * (store the same set of objects as value)
 * 
 * Stores all users. Note that all methods are static.
 * Wherever you import this class, you will be accessing the same data.
 */
class Users {
  static usersById = new Map();  // id -> user
  static usersByName = new Map();  // name -> user
  static nextId = 0;

  /**
   * Add a user to the collection.
   * 
   * @param {string} username
   * @param {string} password
   * @return {User | undefined} - new user, or undefined if username taken
   */
  static addOne(username, password) {
    if (this.usersByName.has(username)) {
      return undefined;
    }
    const id = "" + this.nextId++;
    const user = {username, password, id};
    this.usersByName.set(username, user);
    this.usersById.set(id, user);
    return user;
  }

  /**
   * Find a User by username.
   * 
   * @param {string} username
   * @return {User | undefined} - the found user with specified username
   */
  static findOneByName(username) {
    const user = this.usersByName.get(username);
    return user;
  }

  /**
   * Find a User by user id.
   * 
   * @param {string} id
   * @return {User | undefined} - the found user with specified id
   */
  static findOneById(id) {
    const user = this.usersById.get(id);
    return user;
  }

  /**
   * @return {User[]} an array of all of the users
   */
  static findAll() {
    return [...this.usersById.values()];
  }

  /**
   * Update a User's password.
   * 
   * @param {string} id - The id of the user to update
   * @param {string} password - The new password
   * @return {User | undefined} - The updated user
   */
  static updatePassword(id, password) {
    const user = this.findOneById(id);
    if (user === undefined) return undefined;
    user.password = password;
    return user;
  }

  /**
   * Move user to new username
   * 
   * @param {string} username - The old username
   * @param {string} newUsername - The new username
   * @return {User | undefined} - The updated user
   */
  static updateUsername(id, newUsername) {
    const user = this.findOneById(id);
    if (user === undefined) return undefined;
    this.usersByName.delete(user.username);
    user.username = newUsername;
    this.usersByName.set(newUsername, user);
    return user;
  }

  /**
   * Delete a User from the collection.
   * 
   * @param {string} username - username of User to delete
   * @return {User | undefined} - deleted User
   */
  static deleteOne(id) {
    const user = this.findOneById(id);
    if (user === undefined) return undefined;
    this.usersById.delete(user.id);
    this.usersByName.delete(user.username);
    return user;
  }
}

module.exports = Users;