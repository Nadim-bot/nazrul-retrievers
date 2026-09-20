import { Users, FileText, MessagesSquare, Shield, Key, GitCommit, Database } from 'lucide-react';

export default function DatabasePage() {
  return (
    <div className="bg-brand-cream py-10 px-6 max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold tracking-tight text-brand-navy">Database Design Schema</h2>
        <p className="text-sm text-brand-ink2 font-light mt-1">MongoDB document-oriented database structure — designed for high-performance and scalability using Mongoose ODM.</p>
      </div>

      <div className="bg-brand-gold/8 border border-brand-gold/30 rounded-2xl p-4 mb-8 flex items-start gap-3 text-sm text-brand-gold">
        <Database className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Document References & Embedding:</strong>
          <span className="text-brand-ink font-light block mt-0.5">
            MUser (referenced by ID) ⇄ MItem (referenced by userId) &nbsp;|&nbsp; MChatThread (embedding messages array) &nbsp;|&nbsp; MClaim (referencing userId and itemId)
          </span>
        </div>
      </div>

      {/* Grid of Collections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Collection 1: users */}
        <div className="bg-white border border-brand-border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-brand-navy to-brand-navy-mid text-white px-5 py-3.5 flex items-center gap-2.5 font-bold">
            <Users className="w-5 h-5 text-brand-gold-mid" />
            <span>collection: users</span>
          </div>
          <div className="divide-y divide-brand-surface2">
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy flex items-center gap-1.5 font-mono">
                <Key className="w-3 h-3 text-brand-gold rotate-45" />
                _id
              </span>
              <span className="bg-brand-gold-light text-brand-gold font-bold px-2 py-0.5 rounded text-[10px]">Mongoose.ObjectId</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">id</span>
              <span className="text-brand-ink3">String (Unique Index)</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">studentId</span>
              <span className="text-brand-ink3">String</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">fullName</span>
              <span className="text-brand-ink3">String</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">email</span>
              <span className="text-brand-ink3">String (Unique Index)</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">passwordHash</span>
              <span className="text-brand-ink3">String</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">department</span>
              <span className="text-brand-ink3">String</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">isVerified</span>
              <span className="text-brand-ink3">Boolean (Default: false)</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">createdAt</span>
              <span className="text-brand-ink3">Date (Default: Date.now)</span>
            </div>
          </div>
        </div>

        {/* Collection 2: items */}
        <div className="bg-white border border-brand-border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-brand-navy to-brand-navy-mid text-white px-5 py-3.5 flex items-center gap-2.5 font-bold">
            <FileText className="w-5 h-5 text-brand-gold-mid" />
            <span>collection: items</span>
          </div>
          <div className="divide-y divide-brand-surface2">
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy flex items-center gap-1.5 font-mono">
                <Key className="w-3 h-3 text-brand-gold rotate-45" />
                _id
              </span>
              <span className="bg-brand-gold-light text-brand-gold font-bold px-2 py-0.5 rounded text-[10px]">Mongoose.ObjectId</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy flex items-center gap-1.5 font-mono">
                <GitCommit className="w-3.5 h-3.5 text-brand-gold" />
                userId
              </span>
              <span className="text-brand-gold font-bold">Ref → MUser(id)</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">title</span>
              <span className="text-brand-ink3">String</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">type</span>
              <span className="text-brand-ink3">String ("lost" | "found")</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">category</span>
              <span className="text-brand-ink3">String</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">status</span>
              <span className="text-brand-ink3">String ("active" | "claimed" | "returned" | "deleted")</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">isApproved</span>
              <span className="text-brand-ink3">Boolean (Default: false)</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">createdAt</span>
              <span className="text-brand-ink3">Date (Default: Date.now)</span>
            </div>
          </div>
        </div>

        {/* Collection 3: chat_threads */}
        <div className="bg-white border border-brand-border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-brand-navy to-brand-navy-mid text-white px-5 py-3.5 flex items-center gap-2.5 font-bold">
            <MessagesSquare className="w-5 h-5 text-brand-gold-mid" />
            <span>collection: chat_threads</span>
          </div>
          <div className="divide-y divide-brand-surface2">
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy flex items-center gap-1.5 font-mono">
                <Key className="w-3 h-3 text-brand-gold rotate-45" />
                _id
              </span>
              <span className="bg-brand-gold-light text-brand-gold font-bold px-2 py-0.5 rounded text-[10px]">Mongoose.ObjectId</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">id</span>
              <span className="text-brand-ink3">String (Unique Index)</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy flex items-center gap-1.5 font-mono">
                <GitCommit className="w-3.5 h-3.5 text-brand-gold" />
                itemId
              </span>
              <span className="text-brand-gold font-bold">Ref → MItem(id)</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono font-mono">participants</span>
              <span className="text-brand-ink3">Array [String] (User IDs)</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">messages</span>
              <span className="text-brand-ink3">Embedded Subdocument Array</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-[11px] pl-8 text-brand-navy font-mono">
              <span>↳ messageId, senderId, text, isRead, timestamp</span>
            </div>
          </div>
        </div>

        {/* Collection 4: claims */}
        <div className="bg-white border border-brand-border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-brand-navy to-brand-navy-mid text-white px-5 py-3.5 flex items-center gap-2.5 font-bold">
            <Shield className="w-5 h-5 text-brand-gold-mid" />
            <span>collection: claims</span>
          </div>
          <div className="divide-y divide-brand-surface2">
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy flex items-center gap-1.5 font-mono">
                <Key className="w-3 h-3 text-brand-gold rotate-45" />
                _id
              </span>
              <span className="bg-brand-gold-light text-brand-gold font-bold px-2 py-0.5 rounded text-[10px]">Mongoose.ObjectId</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">claim_id</span>
              <span className="text-brand-ink3">String (Unique Index)</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy flex items-center gap-1.5 font-mono">
                <GitCommit className="w-3.5 h-3.5 text-brand-gold" />
                user_id
              </span>
              <span className="text-brand-gold font-bold">Ref → MUser(id)</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy flex items-center gap-1.5 font-mono">
                <GitCommit className="w-3.5 h-3.5 text-brand-gold" />
                item_id
              </span>
              <span className="text-brand-gold font-bold">Ref → MItem(id)</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">proof_description</span>
              <span className="text-brand-ink3">String</span>
            </div>
            <div className="px-5 py-3 flex justify-between text-xs">
              <span className="font-bold text-brand-navy font-mono">status</span>
              <span className="text-brand-ink3">String ("pending" | "approved" | "rejected")</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mongoose Model Script block */}
      <div>
        <h3 className="font-serif text-lg font-bold text-brand-navy mb-4">Mongoose Schema Definition</h3>
        <pre className="bg-brand-navy text-[#E8E4DC] p-6 rounded-2xl overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed border border-brand-gold/15 shadow-sm">
{`import mongoose, { Schema } from 'mongoose';

const itemSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.String, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['lost', 'found'], required: true },
  category: { type: String, required: true },
  status: { type: String, enum: ['active', 'claimed', 'returned', 'deleted'], default: 'active' },
  isApproved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const MItem = mongoose.models.Item || mongoose.model('Item', itemSchema);`}
        </pre>
      </div>
    </div>
  );
}
