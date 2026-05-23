class CreateProjects < ActiveRecord::Migration[8.1]
  def change
    create_table :projects do |t|
      t.string :name, null: false
      t.text :description
      t.integer :status, null: false, default: 0
      t.references :user, null: false, foreign_key: true
      t.datetime :last_activity_at, null: false

      t.timestamps
    end
    add_index :projects, :last_activity_at
    add_index :projects, :status
  end
end
