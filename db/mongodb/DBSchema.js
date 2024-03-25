const {Schema, model} = require("mongoose");
const bcrypt = require("bcrypt");

const SysMasterSchema = new Schema (
    {
        _id: {type:String, required:true},
        value: {type:String, required:true},
        symbol: {type:String},
        type: {type:String, required:true},
        active: {type: Boolean, default: true},
        createdAt: {type: Date, required: true, immutable: true, default: Date.now},
        updatedAt: {type: Date, required: true, default: Date.now },
    },
    { collection: 'sys_master' }
);

const SysCurrencySchema = new Schema (
    {
        _id: {type:String, required:true},
        value: {type:String, required:true},
        symbol: {type:String},
        active: {type: Boolean, default: true},
        createdAt: {type: Date, required: true, immutable: true, default: Date.now},
        updatedAt: {type: Date, required: true, default: Date.now },
        exrate: {type: Schema.Types.Mixed},
        exrateUpdatedAt: {type: Date},
    },
    { collection: 'sys_currency' }
);

const UserProfileSchema = new Schema (
    {
        name: {type:String, required:true},
        email: {type:String, required:true},
        paymentLinkTemplate : {type:String},
        bankAccountInfo: {type:String},
        myFriendId: {type: Schema.Types.ObjectId, ref: "friend"},
        createdAt: {type: Date, required: true, immutable: true, default: Date.now},
        lastUpdated: {type: Date, required: true, default: Date.now },
        active: {type: Boolean, default: true}
    },
    { collection: 'user_profile' }
);

const UserLoginSchema = new Schema (
    {
        email: {type:String, required:true},
        hashedPassword: {type:String, required:true},
        type: {type:String, required:true, default:"local"},
        createdAt: {type: Date, required: true, immutable: true, default: Date.now},
        lastAccess: {type: Date, required: true, default: Date.now },
        profile: {type: Schema.Types.ObjectId, ref: "user_profile",required: true},
        active: {type: Boolean, default: true}
    },
    { collection: 'user_login' }
);

UserLoginSchema.pre("save", async function (next) {
    if (!this.isModified('hashedPassword')) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.hashedPassword = bcrypt.hashSync(this.hashedPassword, salt);
    next();
});

UserLoginSchema.methods.matchPassword = async function(hashedPassword) {
    return await bcrypt.compare(hashedPassword, this.hashedPassword);
};

const FriendSchema = new Schema (
    {
        userProfile: {type: Schema.Types.ObjectId, ref: "user_profile", required: true},
        isMyself: {type: Boolean, required: true, default: false},
        name: {type:String, required: true },        
        email: String,
        members: [{name: {type:String, required: true}, email: String, active: {type:Boolean, default:true}}],
        createdAt: {type: Date, required: true, immutable: true, default: Date.now},
        lastUpdatedAt: {type: Date,required: true, default: Date.now},
        active: {type: Boolean, default: true}
    },
    { collection: 'friend' }
);

const ViewFlattenedFriendsSchema = new Schema (
    {
        userProfile: {type: Schema.Types.ObjectId},
        friendId: {type: Schema.Types.ObjectId},
        firendName: {type:String},        
        friendEmail: {type:String},
        isMyself: {type: Boolean},  
        parentId: {type: Schema.Types.ObjectId},
        parentName: {type:String},
        totalMembers: {type: Number}    
    },
    { collection: 'vw_flattened_friends' }
);

const EventSchema = new Schema (
    {
        userProfile: {type: Schema.Types.ObjectId, ref: "user_profile", required: true},
        eventName: {type:String, required: true},   
        eventDesc:  String,    
        eventNature: {type: String, ref: "sys_master"},
        eventFrequency: {type: String, ref: "sys_master"},
        eventStartDate: Date,
        eventEndDate: Date, 
        expenseDefaultCCY: {type:String, ref: "sys_currency", required: true},
        friendsInvolved: [{type: Schema.Types.ObjectId, ref: "vw_flattened_friends"}],
        lastestExpenses: [{type: Schema.Types.ObjectId, ref: "expense"}],
        lastActivityAt: Date,
        createdAt: {type: Date, required: true, immutable: true, default: Date.now},
        lastUpdatedAt: {type: Date,required: true, default: Date.now},
        active: {type: Boolean, default: true}
    },
    { collection: 'event' }
);

const ExpenseSchema = new Schema (
    {
        event: {type: Schema.Types.ObjectId, ref: "event", required: true},
        expenseType: {type:String, ref: "sys_master", required: true},
        expenseDesc: String,   
        expenseCCY:  {type:String, ref: "sys_currency", required: true},
        expenseAmt: {type:Schema.Types.Decimal128, required:true},    
        expenseDate: {type:Date, required:true},
        paidBy: {type: Schema.Types.ObjectId, ref: "vw_flattened_friends", required: true},
        whoInvolved: [{type: Schema.Types.ObjectId, ref: "vw_flattened_friends"}],
        isCalculated: Boolean,
        createdAt: {type: Date, required: true, immutable: true, default: Date.now},
        lastUpdatedAt: {type: Date,required: true, default: Date.now},
        active: {type: Boolean, default: true}
    },
    { collection: 'expense' }
);

const CalculationSchema = new Schema (
    {
        event: {type: Schema.Types.ObjectId, ref: "event", required: true},
        calculationOptions: {
                expenseSelectionOption: String,
                splitCostOption: String,
                exRateOption: String
        },
        eventCCY: {type: String, ref: "sys_currency", required: true}, 
        calculationCCY: {type: String, ref: "sys_currency", required: true}, 
        expensesInvolved: [{
                            expense: {type: Schema.Types.ObjectId, ref: "expense", required:true}, 
                            expenseCCY: {type: String, required:true, ref: "sys_currency"},
                            expenseAmt: {type:Schema.Types.Decimal128, required:true},
                            paidBy: {type: Schema.Types.ObjectId, ref: "vw_flattened_friends", required:true},                            
                            costSplit: [{
                                friendId: {type: Schema.Types.ObjectId, ref: "vw_flattened_friends"},
                                amount: {type: Schema.Types.Decimal128,required: true}                         
                            }]
                        }],
        involvedCCY: [{type: String, ref: "sys_currency"}], 
        systemExRate:{type: Schema.Types.Mixed},
        calculationExRate:{type: Schema.Types.Mixed},
        calculationPurpose: String,
        calculationResult: {
            numFriendsInvolved: {type: Number},
            totalAmt: { type: Schema.Types.Decimal128},
            directResult: {type: Schema.Types.Mixed},
            simplifiedResult: {type: Schema.Types.Mixed}
        },
        shareCode: {type: String},
        shareCodeExpiry: {type: Date},
        createdAt: {type: Date, required: true, immutable: true, default: Date.now},
        lastUpdatedAt: {type: Date,required: true, default: Date.now},
        active: {type: Boolean, default: true}
    },
    { collection: 'calculation' }
);

module.exports = {
    SysMaster : model("sys_master", SysMasterSchema),
    SysCurrency : model("sys_currency",SysCurrencySchema),
    UserProfile : model("user_profile", UserProfileSchema),
    UserLogin : model("user_login", UserLoginSchema),
    Friend : model("friend", FriendSchema),
    ViewFlattenedFriends: model("vw_flattened_friends", ViewFlattenedFriendsSchema),
    Event : model("event", EventSchema),
    Expense : model("expense", ExpenseSchema),
    Calculation : model("expense_calculation", CalculationSchema),
}