const yup = require("yup");

const registerSchema = yup.object().shape({
    name: yup.string()
        .min(2, "Name: minimum 2 characters")
        .max(50, "Name: maximum 50 characters")
        .required("Name: required"),
    email: yup.string()
        .email('Email: invalid email format')
        .required('Email: required'),
    password: yup.string()
        .min(8, 'Password: must be 8 characters long')
        .matches(/[0-9]/, 'Password: requires a number')
        .matches(/[a-z]/, 'Password: requires a lowercase letter')
        .matches(/[A-Z]/, 'Password: requires an uppercase letter')
        .matches(/[^\w]/, 'Password: requires a symbol'),
    passwordConfirm: yup.string()
        .oneOf([yup.ref('password'), null], 'Confirm: must match "Password" field value'),
    regcode: yup.string().required("Reg Code: required"),
});
  
const loginSchema = yup.object().shape({
    email: yup.string()
        .email('Email: invalid email format')
        .required('Email: required'),
    password: yup.string()
        .required('Password: required'),
});

// yup.addMethod(yup.array, 'unique', function(message, mapper = a => a) {
//     console.log("outer:", message)
//     return this.test('unique', message, function(list) {
//         console.log("inner:", new Set(list.map(mapper)).size)
//         //return list.length  === new Set(list.map(mapper)).size;
//         return true;
//     });
// });

yup.addMethod(yup.array, 'unique', function (field, message) {
    return this.test('unique', message, function (array) {
        if(array == undefined)
            return true;
        
        const uniqueData = Array.from(
            new Set(array.map((row) => row[field]?.toLowerCase()))
        );
        const isUnique = array.length === uniqueData.length;

        if (isUnique) {
            return true;
        }

        const index = array.findIndex(
            (row, i) => row[field]?.toLowerCase() !== uniqueData[i],
        );

        if (array[index][field] === '') {
            return true;
        }

        return this.createError({
            path: `${this.path}.${index}.${field}`,
            message,
        });
    });
  });

const friendSchema = yup.object().shape({
    name: yup.string()
        .min(2, "Name: minimum 2 characters")
        .max(50, "Name: maximum 50 characters")
        .required('Name: required'),
    email: yup.string()
        .email("Email: invalid email format"),
    active: yup.boolean(),
    members: yup.array (
                yup.object({
                    name: yup.string()
                        .min(2, "Name: minimum 2 characters in one of the member")
                        .max(50, "Name: maximum 50 characters in one of the member")
                        .required("Name: required in one of the member"),
                    email: yup.string()
                        .email("Email: invalid email format in one of the member"),
                    active: yup.boolean(),
                })
            )
            .unique("name","Name: cannot have duplicated name in the member list")
});

const eventSchema = yup.object().shape({
    eventName: yup.string()
        .min(2, "Name: minimum 2 characters")
        .max(50, "Name: maximum 50 characters")
        .required("Event name: required"),
    eventDesc: yup.string(),
    eventNature: yup.string(),
    eventFrequency: yup.string(),
    eventStartDate: yup.date(),
    eventEndDate: yup.date(), 
    expenseDefaultCCY: yup.string(),
    friendsInvolved: yup.array().of(yup.string()),
    active: yup.boolean()
});

const expenseSchema = yup.object().shape({
    event: yup.string().required("Event ID: required"),
    // expenseType: yup.lazy((value) => yup.string().oneOf(process.env.EXPENSE_TYPE.split(","), `"${value}" is an invalid expense type.`)
    //             .required("Expense Type: required")),
    expenseType: yup.string(),
    expenseDesc: yup.string(),
    expenseCCY:  yup.string(),
    // yup.lazy((value) => yup.string().oneOf(process.env.CURRENCY.split(","), `"${value}" is an invalid currency.`)
    //             .required("Currency: required")),
    expenseAmt: yup.number().typeError("Invalid expense amount provide. It should be a number."),
    expenseDate: yup.date().typeError("Invalid expense date format provide.").required("Expense date: required"),
    paidBy: yup.string().required("Paid by: required"),
    whoInvolved: yup.array().of(yup.string()),
    active: yup.boolean()
});

const profileSchema = yup.object().shape({
    name: yup.string()
        .min(2, "Name: minimum 2 characters")
        .max(50, "Name: maximum 2 characters")
        .required("Name: required"),
    email: yup.string()
        .email('Email: invalid email format')
        .required('Email: required'),
    paymentLinkTemplate: yup.string(),
    bankAccountInfo: yup.string(),
});

const changePasswordSchema = yup.object().shape({
    currentPassword: yup.string()
        .min(8, 'Current password: must be 8 characters long')
        .matches(/[0-9]/, 'Current password: requires a number')
        .matches(/[a-z]/, 'Current password: requires a lowercase letter')
        .matches(/[A-Z]/, 'Current password: requires an uppercase letter')
        .matches(/[^\w]/, 'Current password: requires a symbol')
        .required("Current passsword: required"),
    newPassword: yup.string()
        .min(8, 'Password: must be 8 characters long')
        .matches(/[0-9]/, 'New password: requires a number')
        .matches(/[a-z]/, 'New password: requires a lowercase letter')
        .matches(/[A-Z]/, 'New password: requires an uppercase letter')
        .matches(/[^\w]/, 'New password: requires a symbol')
        .required("New passsword: required")
        .notOneOf([yup.ref('currentPassword'), null], 'New password: cannot be the same as current'),
    confirmPassword: yup.string()
        .required("Confirm passsword: required")
        .oneOf([yup.ref('newPassword'), null], 'Confirm password: must match new password'),        
});


module.exports = {registerSchema, loginSchema, friendSchema, 
                 eventSchema, expenseSchema, profileSchema, 
                 changePasswordSchema};