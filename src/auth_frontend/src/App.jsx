import React, { useState, useEffect } from "react";
import { Actor, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { idlFactory as idlFactory_1 } from "../../declarations/auth_backend";
import { useDispatch } from "react-redux";
import { setActors, clearActors } from "../../auth_frontend/src/redux/actorsSlice";

const App = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authClient, setAuthClient] = useState(null);
  const dispatch = useDispatch();

  // Constants for configuration
  const LOCAL_II_CANISTER = process.env.CANISTER_ID_INTERNET_IDENTITY;
  const LOCAL_HOST = "http://127.0.0.1:4943";
  const II_URL = "http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943";
  // const II_URL = `http://localhost:4943/?canisterId=${LOCAL_II_CANISTER}`;
  const host =
    process.env.DFX_NETWORK === "ic" ? "https://icp0.io" : LOCAL_HOST;

  // Initialize the auth client on component mount
  useEffect(() => {
    initAuthClient();
  }, []);

  const initAuthClient = async () => {
    try {
      const client = await AuthClient.create({
        idleOptions: {
          idleTimeout: 1000 * 60 * 30, // 30 minutes
          disableDefaultIdleCallback: true,
        },
      });
      setAuthClient(client);
    } catch (error) {
      console.error("Error initializing auth client:", error);
      setError("Failed to initialize authentication client.");
    }
  };
  /**
   * Creates an HTTP agent with the given host.
   *
   * If we're not on the IC, also fetches the root key.
   *
   * @returns {Promise<import("@dfinity/agent").HttpAgent>}
   * @throws {Error} If creating the agent fails
   */

  // Helper to initialize the agent
  const initAgent = async () => {
    try {
      const agent = new HttpAgent({ host });
      if (process.env.DFX_NETWORK !== "ic") {
        await agent.fetchRootKey().catch((err) => {
          console.warn(
            "Unable to fetch root key. Check if local replica is running"
          );
          console.error(err);
        });
      }
      return agent;
    } catch (error) {
      console.error("Error creating agent:", error);
      throw error;
    }
  };

  // Function to get client information and create actors
  const clientInfo = async (client) => {
    const identity = client.getIdentity();
    const principal = identity.getPrincipal();
    const isAuthenticated = await client.isAuthenticated();

    setAuthClient(client);

    if (isAuthenticated && principal && !principal.isAnonymous()) {
      const agent = new HttpAgent({ identity });
      const communityActor = Actor.createActor(idlFactory_1, {
        agent,
        canisterId: process.env.CANISTER_ID_AUTH_BACKEND,
      });
      const economyActor = Actor.createActor(idlFactory_1, {
        agent,
        canisterId: process.env.CANISTER_ID_AUTH_BACKEND,
      });

      dispatch(setActors({ communityActor, economyActor }));
      setUserProfile({ principal_id: principal });
    } else {
      setUserProfile(null);
    }
  };

  // Login function
  const login = async () => {
    try {
      if (
        authClient.isAuthenticated() &&
        !authClient.getIdentity().getPrincipal().isAnonymous()
      ) {
        await clientInfo(authClient);
      } else {
        await authClient.login({
          identityProvider:
            process.env.DFX_NETWORK === "ic"
              ? "https://identity.ic0.app/"
              : II_URL,
          onError: (error) => setError(error.message),
          onSuccess: () => clientInfo(authClient),
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Login failed. Please try again.");
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authClient.logout();
      dispatch(clearActors());
      setUserProfile(null);
    } catch (error) {
      console.error("Logout error:", error);
      setError("Failed to log out.");
    }
  };

  // UI and login/logout button handling
  return (
    <div className="container mx-auto p-4">
      <h1 className=" head text-3xl font-bold mb-4">ICP Authentication System</h1>
      <p className="desc">
        This is a simple <span className="descspan">authentication system</span>  using the <span className="descspan">ICP SDK</span> and <span className="descspan">Rust Programming</span>. You can
        login with your <span className="descspan">ICP Account</span>  and see your Athentication <span className="descspan">Address</span>.
      </p>
      <div className="Card">
        <h1 className="headname">Login to get Identity Address</h1>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {userProfile ? (
          <div className="bg-white shadow rounded p-4">
            <div className="address">
              <p className="mb-4">
               <span className="authas"> Authenticated as:</span> <span className="addrss">{" "}
                {userProfile.principal_id?.toText() || "Unknown"}</span>
              </p>
            </div>
            <button onClick={logout} disabled={isLoading} className="btn">
              {isLoading ? "Logging out..." : "LOGOUT"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setIsLoading(true);
              login().finally(() => setIsLoading(false));
            }}
            disabled={isLoading}
            className="btn"
          >
            {isLoading ? "Logging in..." : "LOGIN"}
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
