// frontend/src/pages/Home.js
import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';

const features = [
  { title: 'Smart Matches', desc: 'Find readers who like the same books and topics.' },
  { title: 'Realtime Chat', desc: 'Private chats with message pause, resume & notifications.' },
  { title: 'Safe Profiles', desc: 'Profiles, reports, and moderation tools.' }
];

const Home = () => {
  return (
    <main className="container">
      <section style={{display:'grid', gridTemplateColumns:'1fr 420px', gap:28, alignItems:'center'}}>
        <div>
          <div className="kicker">Welcome to LitBuddy</div>
          <h1>Find readers. Start conversations. Build your reading circle.</h1>
          <p className="muted" style={{maxWidth:600}}>
            Discover people who care about the same books and ideas. Private chat, safe controls, and simple workflows to connect.
          </p>
          <div style={{display:'flex', gap:12, marginTop:16}}>
            <Link to="/matches"><Button>Find matches</Button></Link>
          </div>

          <div style={{marginTop:28, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12}}>
            {features.map((f) => (
              <Card key={f.title} className="card row" style={{padding:12}}>
                <div style={{fontWeight:800, fontSize:14}}>{f.title}</div>
                <small className="muted">{f.desc}</small>
              </Card>
            ))}
          </div>
        </div>

        <aside>
          <Card>
            <h3>New this week</h3>
            <p className="muted">Recently matched readers around the world. Say hello and start short conversations.</p>
            <div style={{marginTop:16}}>
              <img alt="reading" src="https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=600&auto=format&fit=crop&crop=faces" style={{width:'100%', borderRadius:8}}/>
            </div>
          </Card>
        </aside>
      </section>
    </main>
  );
};

export default Home;
