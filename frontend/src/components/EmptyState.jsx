import Icon from "./Icon.jsx";

export default function EmptyState({ title, text, action }) {
  return (
    <div className="empty-state">
      <Icon name="inbox" size={32} />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
