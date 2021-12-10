/**
 * @typedef Freet
 * @prop {string} id - unique string identifying the freet
 * @prop {string} content - freet body
 * @prop {string} authorId - id
 * @prop {string} authorName - username
 */

/**
 * @class Freets
 * 
 * Stores all Freets. Note that all methods are static.
 * Wherever you import this class, you will be accessing the same data.
 */
class Freets {
  static freets = new Map();
  static nextId = 0;

  /**
   * Add a Freet to the collection.
   * 
   * @param {string} content - the body of the freet
   * @param {string} authorId - The author id of the freet
   * @param {string} authorName - The username of the author
   * @return {Freet} - the newly created freet
   */
  static addOne(content, authorId, authorName) {
    const id = "" + this.nextId++;
    const freet = {id, content, authorId, authorName};
    this.freets.set(id, freet);
    return freet;
  }

  /**
   * Find a Freet by Name.
   * 
   * @param {string} id - The id of the freet to find
   * @return {Freet | undefined} - the found freet with above id
   */
  static findOne(id) {
    const freet = this.freets.get(id);
    return freet;
  }

  /**
   * @return {Freet[]} an array of all of the Freets
   */
  static findAll() {
    return [...this.freets.values()];
  }

  /**
   * Find all Freets by some author
   * 
   * @param authorId - the author id
   * @return {Freet[]} array of all author's freets
   */
  static findByAuthor(authorId) {
    return this.findAll().filter(x => x.authorId === authorId);
  }

  /**
   * Update a Freet's content
   * 
   * @param {string} id - The id of the freet to update
   * @param {string} content - The new content of the freet
   * @return {Freet | undefined} - The updated freet
   */
  static updateOne(id, content) {
    const freet = this.findOne(id);
    if (freet === undefined) return undefined;
    freet.content = content;
    return freet;
  }

  /**
   * Delete a Freet from the collection.
   * 
   * @param {string} id - id of Freet to delete
   * @return {Freet | undefined} - deleted Freet
   */
  static deleteOne(id) {
    const freet = this.findOne(id);
    this.freets.delete(id);
    return freet;
  }
}

module.exports = Freets;