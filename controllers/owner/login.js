//controller that covers owners login

/**
 * @swagger
 * resourcePath: /
 * description: OwnersApi
 */

/**
 * @swagger
 * path: /auth/login
 * operations:
 *   -  httpMethod: POST
 *      summary: Owners login with username and password
 *      notes: Authorizes current user with cookie based sessions
 *      nickname: Owner login handler
 *      parameters:
 *        - name: username
 *          description: Your username
 *          paramType: body
 *          required: true
 *          dataType: string
 *        - name: password
 *          description: Your password
 *          paramType: body
 *          required: true
 *          dataType: string
 */

/**
 * @swagger
 * path: /admin/login
 * operations:
 *   -  httpMethod: GET
 *      summary: Owners login form
 *      notes: Owners enters his username and password and submits form
 *      nickname: Admin login form
 */

module.exports = exports = function(core){
  core.app.get('/admin/login', function(request, response){
    response.render('owner/login', {
      'title': 'Owners` login page'
    });
  });
}

