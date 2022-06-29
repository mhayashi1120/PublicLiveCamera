// TODO FIXME currently import from other project. should improve settings.
module.exports = {
  'env': {
    'browser': true,
    'es2021': true
  },
  'extends': [
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaVersion': 12,
    'sourceType': 'module'
  },
  'plugins': [
    '@typescript-eslint'
  ],
  'parserOptions': {
    'project': [
      'tsconfig.json'
    ],
    'createDefaultProgram': true
  },
  'ignorePatterns': [
    '*.js'
  ],
  'overrides': [
    {
      'files': [
        'bin/*.ts',
        'src/**/*.ts'
      ],
      'rules': {
        'object-curly-spacing': 'off',
        'camelcase': 'warn',
        'comma-dangle': 'off',
        'arrow-parens': 'off',
        // TODO Currently off -> warn
        'require-jsdoc': 'off',
        'require-await': 'error',
        // TODO currently off
        // 'max-len': ['error',
        //             {
        //               'code': 120,
        //               'ignoreTemplateLiterals': true,
        //               'ignoreComments': true
        //             }
        //            ],
        'new-cap': ['error',
                    {
                      'capIsNewExceptions':
                      [
                        'INFO', 'ERROR', 'VERB', 'WARN', 'D',
                        'OpenLogging',
                        'FromS2CellId', 'FromSegment',
                      ]
                    }
                   ],
        // TODO should be improved
        // 'indent': ['error', 2],
      }
    }
  ],
  'rules': {
  },
};
